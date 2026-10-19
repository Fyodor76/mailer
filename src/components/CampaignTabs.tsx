"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";

type Props = {
  campaignId: string;
  summary: ReactNode;
  setup: ReactNode;
  analytics: ReactNode;
  history: ReactNode;
};

export function CampaignTabs({
  campaignId,
  summary,
  setup,
  analytics,
  history,
}: Props) {
  const [tab, setTab] = useState<"setup" | "analytics" | "history">("setup");

  return (
    <div className="stack">
      <div className="tabs">
        <button
          type="button"
          className={`tab ${tab === "setup" ? "tab-active" : ""}`}
          onClick={() => setTab("setup")}
        >
          Рассылка
        </button>
        <button
          type="button"
          className={`tab ${tab === "analytics" ? "tab-active" : ""}`}
          onClick={() => setTab("analytics")}
        >
          Аналитика
        </button>
        <button
          type="button"
          className={`tab ${tab === "history" ? "tab-active" : ""}`}
          onClick={() => setTab("history")}
        >
          История
        </button>
        <Link href={`/campaigns/${campaignId}/report`} className="tab tab-link">
          Полный отчёт
        </Link>
      </div>

      {tab === "setup" ? (
        <>
          {summary}
          {setup}
        </>
      ) : tab === "analytics" ? (
        analytics
      ) : (
        history
      )}
    </div>
  );
}
