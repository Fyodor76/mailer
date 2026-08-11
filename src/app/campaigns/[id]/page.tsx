import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CampaignAutoRefresh } from "@/components/CampaignAutoRefresh";
import { CampaignControls } from "@/components/CampaignControls";
import { CampaignTabs } from "@/components/CampaignTabs";
import { CampaignToolbar } from "@/components/CampaignToolbar";
import { prisma } from "@/lib/db";
import {
  campaignStatusClass,
  campaignStatusLabel,
  formatDate,
  recipientStatusLabel,
  shouldPollCampaign,
} from "@/lib/format";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Рассылка",
};

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CampaignPage({ params }: Props) {
  const { id } = await params;
  const campaign = await prisma.campaign.findUnique({
    where: { id },
    include: {
      provider: true,
      recipients: {
        orderBy: { createdAt: "asc" },
        take: 100,
      },
    },
  });

  if (!campaign) notFound();

  const grouped = await prisma.recipient.groupBy({
    by: ["status"],
    where: { campaignId: id },
    _count: true,
  });

  const stats = {
    total: 0,
    pending: 0,
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    failed: 0,
    bounced: 0,
    skipped: 0,
  };
  for (const g of grouped) {
    stats.total += g._count;
    if (g.status === "PENDING") stats.pending = g._count;
    if (g.status === "SENT") stats.sent = g._count;
    if (g.status === "DELIVERED") stats.delivered = g._count;
    if (g.status === "OPENED") stats.opened = g._count;
    if (g.status === "CLICKED") stats.clicked = g._count;
    if (g.status === "FAILED" || g.status === "SPAM" || g.status === "UNSUBSCRIBED")
      stats.failed += g._count;
    if (g.status === "BOUNCED") stats.bounced = g._count;
    if (g.status === "SKIPPED") stats.skipped = g._count;
  }

  const errors = stats.failed + stats.bounced;
  const sentOut =
    stats.sent + stats.delivered + stats.opened + stats.clicked;

  const canEdit = campaign.status !== "RUNNING";
  const poll = shouldPollCampaign(campaign.status, campaign.recipients);

  const summary = (
    <div className="stats" style={{ marginBottom: 0 }}>
      <div className="stat">
        <strong>{stats.total}</strong>
        <span>Всего</span>
      </div>
      <div className="stat">
        <strong>{sentOut}</strong>
        <span>Отправлено</span>
      </div>
      <div className="stat">
        <strong>{errors}</strong>
        <span>Ошибки</span>
      </div>
    </div>
  );

  const setup = (
    <div className="grid-2">
      <CampaignControls
        campaignId={campaign.id}
        canEdit={canEdit}
        recipientCount={stats.total}
        initial={{
          name: campaign.name,
          subject: campaign.subject,
          bodyHtml: campaign.bodyHtml,
          bodyText: campaign.bodyText,
          batchSize: campaign.batchSize,
          delayMs: campaign.delayMs,
        }}
      />

      <div className="panel recipients-panel">
        <div
          className="row"
          style={{ justifyContent: "space-between", marginBottom: "0.75rem" }}
        >
          <h2 style={{ fontSize: "1.2rem" }}>Получатели</h2>
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            {stats.total > 100
              ? `первые 100 из ${stats.total.toLocaleString("ru-RU")}`
              : `${stats.total}`}
          </span>
        </div>
        {campaign.recipients.length === 0 ? (
          <div className="empty">
            Загрузите Excel слева и нажмите «Сохранить»
          </div>
        ) : (
          <div className="stack" style={{ gap: "0.75rem" }}>
            <div className="chip-list">
              {campaign.recipients.map((r) => (
                <span
                  key={r.id}
                  className={`chip chip-${r.status.toLowerCase()}`}
                  title={r.error || recipientStatusLabel(r.status)}
                >
                  <span className="chip-email">{r.email}</span>
                  {r.label ? (
                    <span className="chip-label">{r.label}</span>
                  ) : null}
                  <span className="chip-status">
                    {recipientStatusLabel(r.status)}
                  </span>
                </span>
              ))}
            </div>
            {campaign.recipients.some((r) => r.error) ? (
              <div className="alert">
                {campaign.recipients.find((r) => r.error)?.error}
              </div>
            ) : null}
          </div>
        )}
        <p className="muted" style={{ fontSize: "0.82rem", marginTop: "1rem" }}>
          Старт: {formatDate(campaign.startedAt)} · Финиш:{" "}
          {formatDate(campaign.finishedAt)}
        </p>
      </div>
    </div>
  );

  const analytics = (
    <div className="panel analytics-panel">
      <div className="analytics-head">
        <div>
          <h2 style={{ fontSize: "1.15rem" }}>Воронка</h2>
          <p className="muted" style={{ margin: "0.25rem 0 0", fontSize: "0.88rem" }}>
            Статусы из API и вебхуков Unisender
          </p>
        </div>
        <Link className="btn btn-secondary" href={`/campaigns/${id}/report`}>
          Полный отчёт
        </Link>
      </div>

      <div className="analytics-grid">
        {[
          { value: stats.total, label: "Всего" },
          { value: stats.pending, label: "Ожидает" },
          { value: stats.sent, label: "В пути" },
          { value: stats.delivered, label: "Доставлено" },
          { value: stats.opened, label: "Открыто" },
          { value: stats.clicked, label: "Клики" },
          { value: stats.bounced, label: "Отскоки" },
          { value: stats.failed, label: "Ошибки" },
        ].map((item) => (
          <div key={item.label} className="analytics-metric">
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <CampaignAutoRefresh
        active={poll}
        intervalMs={campaign.status === "RUNNING" ? 2000 : 4000}
      />
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <p className="muted" style={{ margin: "0 0 0.35rem" }}>
              <Link href="/" className="back-link">
                ← Рассылки
              </Link>
            </p>
            <h1>{campaign.name}</h1>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              <span className={campaignStatusClass(campaign.status)}>
                {campaignStatusLabel(campaign.status)}
              </span>
              <span className="muted" style={{ fontSize: "0.9rem" }}>
                {campaign.provider?.name ?? "Провайдер не выбран"}
              </span>
              {campaign.errorMessage ? (
                <span className="badge badge-failed">{campaign.errorMessage}</span>
              ) : null}
            </div>
          </div>
          <CampaignToolbar
            campaignId={campaign.id}
            status={campaign.status}
            pendingCount={stats.pending}
            failedCount={errors}
            hasSubject={Boolean(campaign.subject.trim())}
          />
        </div>

        <CampaignTabs
          campaignId={campaign.id}
          summary={summary}
          setup={setup}
          analytics={analytics}
        />
      </main>
    </>
  );
}
