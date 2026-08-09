import {
  CampaignStatus,
  RecipientStatus,
  type Campaign,
  type Recipient,
} from "@prisma/client";

const campaignStatusLabels: Record<CampaignStatus, string> = {
  DRAFT: "Черновик",
  READY: "Готова",
  RUNNING: "Идёт",
  PAUSED: "Пауза",
  DONE: "Готово",
  FAILED: "Ошибка",
};

const recipientStatusLabels: Record<RecipientStatus, string> = {
  PENDING: "Ожидает",
  SENT: "Отправлено",
  DELIVERED: "Доставлено",
  OPENED: "Открыто",
  CLICKED: "Клик",
  FAILED: "Ошибка",
  BOUNCED: "Отскок",
  SPAM: "Спам",
  UNSUBSCRIBED: "Отписка",
  SKIPPED: "Пропущено",
};

export function campaignStatusLabel(status: CampaignStatus) {
  return campaignStatusLabels[status];
}

export function recipientStatusLabel(status: RecipientStatus) {
  return recipientStatusLabels[status];
}

export function campaignStatusClass(status: CampaignStatus) {
  switch (status) {
    case "RUNNING":
      return "badge badge-running";
    case "DONE":
      return "badge badge-done";
    case "FAILED":
      return "badge badge-failed";
    case "PAUSED":
      return "badge badge-paused";
    case "READY":
      return "badge badge-ready";
    default:
      return "badge";
  }
}

export type CampaignStats = {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  skipped: number;
};

export function calcStats(
  recipients: Pick<Recipient, "status">[],
): CampaignStats {
  const stats: CampaignStats = {
    total: recipients.length,
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    failed: 0,
    skipped: 0,
  };
  for (const r of recipients) {
    switch (r.status) {
      case "PENDING":
        stats.pending += 1;
        break;
      case "SENT":
        stats.sent += 1;
        break;
      case "DELIVERED":
        stats.delivered += 1;
        break;
      case "OPENED":
      case "CLICKED":
        stats.opened += 1;
        break;
      case "FAILED":
      case "BOUNCED":
      case "SPAM":
      case "UNSUBSCRIBED":
        stats.failed += 1;
        break;
      case "SKIPPED":
        stats.skipped += 1;
        break;
    }
  }
  return stats;
}

/** Keep polling while sending or waiting for delivery webhooks. */
export function shouldPollCampaign(
  campaignStatus: CampaignStatus,
  recipients: Pick<Recipient, "status">[],
): boolean {
  if (campaignStatus === "RUNNING") return true;
  return recipients.some((r) =>
    ["SENT", "DELIVERED", "OPENED", "PENDING"].includes(r.status),
  );
}

export function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type CampaignWithCount = Campaign & {
  _count?: { recipients: number };
};
