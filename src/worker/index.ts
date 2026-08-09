import { prisma } from "../lib/db";
import { sendUnisenderEmail } from "../lib/unisender";

const POLL_MS = Number(process.env.WORKER_POLL_MS || 2000);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function claimCampaign() {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Campaign"
      WHERE status = 'RUNNING'
      ORDER BY "updatedAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    if (!rows[0]) return null;

    return tx.campaign.findUnique({
      where: { id: rows[0].id },
      include: { provider: true },
    });
  });
}

async function processCampaign(
  campaign: NonNullable<Awaited<ReturnType<typeof claimCampaign>>>,
) {
  if (!campaign.provider) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "FAILED",
        errorMessage: "Провайдер не выбран",
        finishedAt: new Date(),
      },
    });
    return;
  }

  if (!campaign.subject.trim()) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        status: "FAILED",
        errorMessage: "Не указана тема письма",
        finishedAt: new Date(),
      },
    });
    return;
  }

  const batch = await prisma.recipient.findMany({
    where: { campaignId: campaign.id, status: "PENDING" },
    take: Math.max(1, Math.min(campaign.batchSize, 500)),
    orderBy: { createdAt: "asc" },
  });

  if (batch.length === 0) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "DONE", finishedAt: new Date(), errorMessage: null },
    });
    console.log(`[worker] campaign ${campaign.id} done`);
    return;
  }

  const provider = campaign.provider;
  console.log(
    `[worker] campaign ${campaign.id}: sending ${batch.length} emails`,
  );

  const result = await sendUnisenderEmail({
    apiKey: provider.apiKey,
    apiUrl: provider.apiUrl,
    fromEmail: provider.fromEmail,
    fromName: provider.fromName,
    replyTo: provider.replyTo,
    customBackendId: provider.customBackendId,
    subject: campaign.subject,
    bodyHtml: campaign.bodyHtml,
    bodyText: campaign.bodyText,
    campaignId: campaign.id,
    recipients: batch.map((r) => ({
      email: r.email,
      substitutions: r.label ? { to_name: r.label } : undefined,
    })),
  });

  const failedMap = result.failedEmails;
  const acceptedSet = new Set(
    result.emails.map((e) => e.toLowerCase()),
  );

  const now = new Date();

  if (!result.ok && Object.keys(failedMap).length === 0 && acceptedSet.size === 0) {
    // whole request failed — mark batch as failed
    const error = result.error || "Send failed";
    await prisma.recipient.updateMany({
      where: { id: { in: batch.map((r) => r.id) } },
      data: {
        status: "FAILED",
        error,
        sentAt: now,
      },
    });
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { errorMessage: error.slice(0, 500) },
    });
    console.error(`[worker] campaign ${campaign.id} send failed:`, error);
  } else {
    await Promise.all(
      batch.map((r) => {
        const key = r.email.toLowerCase();
        const failReason = failedMap[r.email] || failedMap[key];
        if (failReason) {
          return prisma.recipient.update({
            where: { id: r.id },
            data: {
              status: "FAILED",
              error: failReason,
              providerJobId: result.jobId,
              sentAt: now,
            },
          });
        }
        // accepted or assumed sent if request ok and not in failed
        if (acceptedSet.has(key) || result.ok) {
          return prisma.recipient.update({
            where: { id: r.id },
            data: {
              status: "SENT",
              error: null,
              providerJobId: result.jobId,
              sentAt: now,
            },
          });
        }
        return prisma.recipient.update({
          where: { id: r.id },
          data: {
            status: "FAILED",
            error: result.error || "Unknown",
            providerJobId: result.jobId,
            sentAt: now,
          },
        });
      }),
    );
  }

  // re-check if campaign still running (may have been paused)
  const fresh = await prisma.campaign.findUnique({
    where: { id: campaign.id },
    select: { status: true, delayMs: true },
  });

  if (!fresh || fresh.status !== "RUNNING") {
    return;
  }

  const remaining = await prisma.recipient.count({
    where: { campaignId: campaign.id, status: "PENDING" },
  });

  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: "DONE", finishedAt: new Date(), errorMessage: null },
    });
    console.log(`[worker] campaign ${campaign.id} done`);
    return;
  }

  await sleep(Math.max(0, fresh.delayMs));
}

async function loop() {
  console.log("[worker] started");
  for (;;) {
    try {
      const campaign = await claimCampaign();
      if (!campaign) {
        await sleep(POLL_MS);
        continue;
      }
      await processCampaign(campaign);
    } catch (err) {
      console.error("[worker] error", err);
      await sleep(POLL_MS);
    }
  }
}

loop();
