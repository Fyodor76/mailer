import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  mapUnisenderStatus,
  shouldUpgradeStatus,
  verifyUnisenderWebhookAuth,
  type UnisenderWebhookPayload,
} from "@/lib/webhook";

export const runtime = "nodejs";

/** Unisender checks GET → 200 before activating webhook. */
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  const provider = await prisma.provider.findFirst({
    where: { type: "UNISENDER_GO" },
  });

  if (!provider) {
    return NextResponse.json({ error: "No provider" }, { status: 503 });
  }

  if (!verifyUnisenderWebhookAuth(rawBody, provider.apiKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: UnisenderWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as UnisenderWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const events =
    payload.events_by_user?.flatMap((u) => u.events ?? []) ?? [];

  for (const event of events) {
    if (event.event_name !== "transactional_email_status") continue;
    const data = event.event_data;
    if (!data?.email || !data.status) continue;

    const nextStatus = mapUnisenderStatus(data.status);
    if (!nextStatus) continue;

    const email = data.email.toLowerCase();
    const jobId = data.job_id;
    const campaignMeta =
      data.metadata?.mail_campaign_id || data.metadata?.campaign_id;

    let recipient =
      (jobId
        ? await prisma.recipient.findFirst({
            where: {
              email,
              providerJobId: jobId,
            },
            orderBy: { updatedAt: "desc" },
          })
        : null) ??
      (campaignMeta
        ? await prisma.recipient.findFirst({
            where: {
              email,
              campaignId: campaignMeta,
            },
          })
        : null) ??
      (await prisma.recipient.findFirst({
        where: {
          email,
          status: {
            in: [
              "SENT",
              "DELIVERED",
              "OPENED",
              "CLICKED",
              "PENDING",
            ],
          },
        },
        orderBy: { updatedAt: "desc" },
      }));

    if (!recipient) continue;
    if (!shouldUpgradeStatus(recipient.status, nextStatus)) continue;

    const eventTime = data.event_time
      ? new Date(data.event_time.replace(" ", "T") + "Z")
      : new Date();

    const error =
      nextStatus === "BOUNCED" || nextStatus === "SPAM" || nextStatus === "FAILED"
        ? data.delivery_info?.destination_response ||
          data.delivery_info?.delivery_status ||
          data.status
        : null;

    await prisma.recipient.update({
      where: { id: recipient.id },
      data: {
        status: nextStatus,
        deliveryStatus: data.status,
        error,
        providerJobId: jobId || recipient.providerJobId,
        deliveredAt:
          nextStatus === "DELIVERED" ||
          nextStatus === "OPENED" ||
          nextStatus === "CLICKED"
            ? recipient.deliveredAt ?? eventTime
            : recipient.deliveredAt,
        openedAt:
          nextStatus === "OPENED" || nextStatus === "CLICKED"
            ? recipient.openedAt ?? eventTime
            : recipient.openedAt,
      },
    });
  }

  return NextResponse.json({ status: "success" });
}
