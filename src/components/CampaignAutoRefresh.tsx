"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Poll server so status/chips update during send and after webhooks. */
export function CampaignAutoRefresh({
  active,
  intervalMs = 2000,
}: {
  active: boolean;
  intervalMs?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs, router]);

  return null;
}
