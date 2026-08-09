import { AppHeader } from "@/components/AppHeader";
import { CampaignAutoRefresh } from "@/components/CampaignAutoRefresh";
import { DeleteCampaignButton } from "@/components/CampaignToolbar";
import { prisma } from "@/lib/db";
import {
  calcStats,
  campaignStatusClass,
  campaignStatusLabel,
  formatDate,
} from "@/lib/format";
import { createCampaignAction } from "@/app/actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Рассылки",
};

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      recipients: { select: { status: true } },
      provider: { select: { name: true } },
    },
  });

  const needsPoll = campaigns.some(
    (c) =>
      c.status === "RUNNING" ||
      c.recipients.some((r) =>
        ["SENT", "DELIVERED", "OPENED", "PENDING"].includes(r.status),
      ),
  );

  return (
    <>
      <CampaignAutoRefresh active={needsPoll} intervalMs={3000} />
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <h1>Рассылки</h1>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Создайте запуск, загрузите базу и отправьте письма
            </p>
          </div>
          <form action={createCampaignAction}>
            <input type="hidden" name="name" value="Новый запуск" />
            <button className="btn" type="submit">
              Новый запуск
            </button>
          </form>
        </div>

        <div className="panel">
          {campaigns.length === 0 ? (
            <div className="empty">
              Пока пусто. Создайте первый запуск и загрузите базу почт.
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Название</th>
                  <th>Статус</th>
                  <th>Прогресс</th>
                  <th>Создана</th>
                  <th style={{ width: 48 }} />
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const stats = calcStats(c.recipients);
                  const progressed =
                    stats.sent + stats.delivered + stats.opened;
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={`/campaigns/${c.id}`} className="campaign-link">
                          <strong>{c.name}</strong>
                        </Link>
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {c.subject || "Без темы"}
                        </div>
                      </td>
                      <td>
                        <span className={campaignStatusClass(c.status)}>
                          {campaignStatusLabel(c.status)}
                        </span>
                      </td>
                      <td>
                        {progressed}/{stats.total}
                        {stats.delivered > 0 ? (
                          <span className="muted">
                            {" "}
                            · доставл. {stats.delivered}
                          </span>
                        ) : null}
                        {stats.failed > 0 ? (
                          <span className="muted"> · ошибок {stats.failed}</span>
                        ) : null}
                      </td>
                      <td className="muted">{formatDate(c.createdAt)}</td>
                      <td>
                        <DeleteCampaignButton
                          campaignId={c.id}
                          name={c.name}
                          disabled={c.status === "RUNNING"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
