import type { RecipientStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mapUnisenderStatus, shouldUpgradeStatus } from "@/lib/webhook";

type DumpFile = { url?: string };
type DumpBody = {
  status?: string;
  message?: string;
  dump_id?: string;
  dump_status?: string;
  files?: DumpFile[];
  event_dump?: {
    dump_status?: string;
    files?: DumpFile[];
  };
  event_dumps?: Array<{
    dump_status?: string;
    files?: DumpFile[];
  }>;
};

function formatUnisenderTime(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCsv(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  if (cell || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const header = (rows.shift() ?? []).map((name) => name.trim());
  return rows
    .filter((item) => item.some((value) => value.trim()))
    .map((item) => {
      const record: Record<string, string> = {};
      for (let i = 0; i < header.length; i++) {
        record[header[i]] = item[i] ?? "";
      }
      return record;
    });
}

async function unisenderPost(apiUrl: string, apiKey: string, path: string, body: unknown) {
  const base = apiUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as DumpBody | null;
  return { httpOk: res.ok, data };
}

function pickDump(data: DumpBody | null) {
  if (!data) return null;
  return data.event_dump ?? data.event_dumps?.[0] ?? data;
}

export async function restoreCampaignFromUnisender(campaignId: string, userId: string) {
  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, userId },
    include: { provider: true },
  });
  if (!campaign) return { error: "Рассылка не найдена" };
  if (!campaign.provider) return { error: "Сначала сохраните провайдера" };
  if (campaign.status === "RUNNING") return { error: "Сначала поставьте на паузу" };

  const start = new Date(campaign.startedAt ?? campaign.createdAt);
  start.setUTCDate(start.getUTCDate() - 1);
  const end = new Date(Date.now() + 60 * 60 * 1000);
  const provider = campaign.provider;

  const created = await unisenderPost(
    provider.apiUrl,
    provider.apiKey,
    "event-dump/create.json",
    {
      start_time: formatUnisenderTime(start),
      end_time: formatUnisenderTime(end),
      limit: 50000,
      all_projects: false,
      filter: { email_from: provider.fromEmail },
      dump_fields: ["event_time", "job_id", "email", "status", "subject", "metadata"],
      delimiter: ";",
    },
  );
  if (!created.httpOk || created.data?.status === "error" || !created.data?.dump_id) {
    return {
      error: created.data?.message || "Unisender не создал выгрузку отправленных писем",
    };
  }

  let files: DumpFile[] = [];
  let dumpStatus = "";
  for (let attempt = 0; attempt < 15; attempt++) {
    const got = await unisenderPost(provider.apiUrl, provider.apiKey, "event-dump/get.json", {
      dump_id: created.data.dump_id,
    });
    const dump = pickDump(got.data);
    dumpStatus = dump?.dump_status ?? "";
    files = dump?.files ?? [];
    if (dumpStatus === "failed") return { error: "Выгрузка Unisender завершилась ошибкой" };
    if (files.some((file) => file.url) && dumpStatus !== "in_process") break;
    await sleep(2000);
  }

  const urls = files.map((file) => file.url).filter((url): url is string => Boolean(url));
  if (urls.length === 0) {
    return {
      error: `Выгрузка ещё готовится (${dumpStatus || "ожидание"}). Нажмите восстановление ещё раз через минуту.`,
    };
  }

  const rows: Record<string, string>[] = [];
  for (const url of urls) {
    const csv = await fetch(url).then((res) => res.text());
    rows.push(...parseCsv(csv, ";"));
  }

  const subject = campaign.subject.trim();
  const tagged = rows.filter((row) => (row.metadata || "").includes(campaign.id));
  const matched =
    tagged.length > 0
      ? tagged
      : rows.filter((row) => subject && (row.subject || "").trim() === subject);

  const best = new Map<
    string,
    { status: RecipientStatus; at: Date; jobId: string | null }
  >();
  for (const row of matched) {
    const email = (row.email || "").trim().toLowerCase();
    const status = mapUnisenderStatus(row.status || "");
    if (!email || !status) continue;
    const at = row.event_time
      ? new Date(row.event_time.replace(" ", "T") + "Z")
      : new Date();
    const prev = best.get(email);
    if (!prev || shouldUpgradeStatus(prev.status, status)) {
      best.set(email, { status, at, jobId: row.job_id || null });
    }
  }

  if (best.size === 0) {
    return {
      error:
        "В Unisender нет писем этой рассылки с даты старта. Сверьте From и тему — восстановление ищет по ним.",
    };
  }

  let updated = 0;
  for (const [email, info] of best) {
    const existing = await prisma.recipient.findUnique({
      where: { campaignId_email: { campaignId, email } },
    });
    if (!existing) {
      await prisma.recipient.create({
        data: {
          campaignId,
          email,
          status: info.status,
          providerJobId: info.jobId,
          sentAt: info.at,
        },
      });
      updated++;
      continue;
    }
    if (existing.status === "PENDING" || shouldUpgradeStatus(existing.status, info.status)) {
      await prisma.recipient.update({
        where: { id: existing.id },
        data: {
          status: info.status,
          providerJobId: info.jobId || existing.providerJobId,
          sentAt: existing.sentAt ?? info.at,
          error: null,
        },
      });
      updated++;
    }
  }

  await prisma.sendEvent.deleteMany({
    where: { campaignId, source: "restore" },
  });
  await prisma.sendEvent.createMany({
    data: [...best.entries()].map(([email, info]) => ({
      campaignId,
      email,
      status: info.status,
      providerJobId: info.jobId,
      sentAt: info.at,
      source: "restore",
    })),
  });

  const pending = await prisma.recipient.count({
    where: { campaignId, status: "PENDING" },
  });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: pending > 0 ? (campaign.status === "PAUSED" ? "PAUSED" : "READY") : "DONE",
      finishedAt: pending > 0 ? campaign.finishedAt : campaign.finishedAt ?? new Date(),
    },
  });

  return { ok: true as const, found: best.size, updated };
}
