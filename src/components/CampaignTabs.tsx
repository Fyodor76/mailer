"use client";

import { type ReactNode, useState } from "react";
import Link from "next/link";

type Props = {
  campaignId: string;
  summary: ReactNode;
  setup: ReactNode;
  analytics: ReactNode;
};

export function CampaignTabs({ campaignId, summary, setup, analytics }: Props) {
  const [tab, setTab] = useState<"setup" | "analytics">("setup");

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
        <Link href={`/campaigns/${campaignId}/report`} className="tab tab-link">
          Полный отчёт
        </Link>
      </div>

      {tab === "setup" ? (
        <>
          {summary}
          {setup}
        </>
      ) : (
        analytics
      )}
    </div>
  );
}
