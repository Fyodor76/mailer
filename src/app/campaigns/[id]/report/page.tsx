import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CampaignAutoRefresh } from "@/components/CampaignAutoRefresh";
import { prisma } from "@/lib/db";
import {
  campaignStatusClass,
  campaignStatusLabel,
  formatDate,
  recipientStatusLabel,
  shouldPollCampaign,
} from "@/lib/format";
import type { RecipientStatus } from "@prisma/client";

export const metadata: Metadata = {
  title: "Отчёт",
};

export const dynamic = "force-dynamic";

const FILTERS: Array<{ value: string; label: string }> = [
  { value: "", label: "Все" },
  { value: "SENT", label: "Отправлено" },
  { value: "DELIVERED", label: "Доставлено" },
  { value: "OPENED", label: "Открыто" },
  { value: "CLICKED", label: "Клик" },
  { value: "PENDING", label: "Ожидает" },
  { value: "FAILED", label: "Ошибки" },
  { value: "BOUNCED", label: "Отскок" },
];

const ALL_STATUSES = FILTERS.map((f) => f.value).filter(Boolean);

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
};

export default async function ReportPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { status } = await searchParams;

  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: { recipients: { select: { status: true } } },
  });
  if (!campaign) notFound();

  const statusFilter = status?.toUpperCase();
  const where = {
    campaignId: id,
    ...(statusFilter && ALL_STATUSES.includes(statusFilter)
      ? { status: statusFilter as RecipientStatus }
      : {}),
  };

  const [grouped, recipients] = await Promise.all([
    prisma.recipient.groupBy({
      by: ["status"],
      where: { campaignId: id },
      _count: true,
    }),
    prisma.recipient.findMany({
      where,
      orderBy: [{ status: "asc" }, { email: "asc" }],
      take: 500,
    }),
  ]);

  const counts: Record<string, number> = {};
  let total = 0;
  for (const g of grouped) {
    counts[g.status] = g._count;
    total += g._count;
  }

  const failed =
    (counts.FAILED || 0) +
    (counts.BOUNCED || 0) +
    (counts.SPAM || 0) +
    (counts.UNSUBSCRIBED || 0);

  const poll = shouldPollCampaign(campaign.status, campaign.recipients);

  return (
    <>
      <CampaignAutoRefresh active={poll} intervalMs={4000} />
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <p className="muted" style={{ margin: "0 0 0.35rem" }}>
              <Link href={`/campaigns/${id}`} className="back-link">
                ← Назад к рассылке
              </Link>
            </p>
            <h1>Отчёт: {campaign.name}</h1>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <span className={campaignStatusClass(campaign.status)}>
                {campaignStatusLabel(campaign.status)}
              </span>
              <span className="muted">{campaign.subject || "Без темы"}</span>
            </div>
          </div>
        </div>

        <div className="stats stats-6" style={{ marginBottom: "1rem" }}>
          <div className="stat">
            <strong>{total}</strong>
            <span>Всего</span>
          </div>
          <div className="stat">
            <strong>{counts.SENT || 0}</strong>
            <span>Отправлено</span>
          </div>
          <div className="stat">
            <strong>{counts.DELIVERED || 0}</strong>
            <span>Доставлено</span>
          </div>
          <div className="stat">
            <strong>{(counts.OPENED || 0) + (counts.CLICKED || 0)}</strong>
            <span>Открыто</span>
          </div>
          <div className="stat">
            <strong>{counts.PENDING || 0}</strong>
            <span>Ожидает</span>
          </div>
          <div className="stat">
            <strong>{failed}</strong>
            <span>Ошибки</span>
          </div>
        </div>

        <div className="row" style={{ marginBottom: "1rem" }}>
          {FILTERS.map(({ value, label }) => (
            <Link
              key={value || "all"}
              href={
                value
                  ? `/campaigns/${id}/report?status=${value}`
                  : `/campaigns/${id}/report`
              }
              className={`btn ${status === value || (!status && !value) ? "" : "btn-secondary"}`}
              style={{ padding: "0.45rem 0.9rem" }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="panel">
          {recipients.length === 0 ? (
            <div className="empty">Нет записей</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Label</th>
                  <th>Статус</th>
                  <th>Ошибка</th>
                  <th>Время</th>
                </tr>
              </thead>
              <tbody>
                {recipients.map((r) => (
                  <tr key={r.id}>
                    <td>{r.email}</td>
                    <td className="muted">{r.label || "—"}</td>
                    <td>{recipientStatusLabel(r.status)}</td>
                    <td className="muted">{r.error || r.deliveryStatus || "—"}</td>
                    <td className="muted">
                      {formatDate(r.openedAt || r.deliveredAt || r.sentAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {total > 500 ? (
            <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
              Показаны первые 500 записей фильтра
            </p>
          ) : null}
        </div>
      </main>
    </>
  );
}
