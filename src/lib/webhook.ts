import { createHash } from "crypto";
import type { RecipientStatus } from "@prisma/client";

export type UnisenderWebhookEvent = {
  event_name?: string;
  event_data?: {
    job_id?: string;
    email?: string;
    status?: string;
    event_time?: string;
    url?: string;
    metadata?: Record<string, string>;
    delivery_info?: {
      delivery_status?: string;
      destination_response?: string;
    };
  };
};

export type UnisenderWebhookPayload = {
  auth?: string;
  events_by_user?: Array<{
    events?: UnisenderWebhookEvent[];
  }>;
};

/** Verify Unisender Go webhook auth (MD5 of body with auth → apiKey). */
export function verifyUnisenderWebhookAuth(
  rawBody: string,
  apiKey: string,
): boolean {
  let parsed: UnisenderWebhookPayload;
  try {
    parsed = JSON.parse(rawBody) as UnisenderWebhookPayload;
  } catch {
    return false;
  }

  const auth = parsed.auth;
  if (!auth || !apiKey) return false;

  const variants = [
    rawBody.replace(`"auth":"${auth}"`, `"auth":"${apiKey}"`),
    rawBody.replace(`"auth": "${auth}"`, `"auth": "${apiKey}"`),
    rawBody.replace(`"auth" : "${auth}"`, `"auth" : "${apiKey}"`),
  ];

  return variants.some((candidate) => {
    if (candidate === rawBody) return false;
    const hash = createHash("md5").update(candidate, "utf8").digest("hex");
    return hash === auth;
  });
}

const STATUS_RANK: Record<RecipientStatus, number> = {
  PENDING: 0,
  SKIPPED: 0,
  SENT: 1,
  DELIVERED: 2,
  OPENED: 3,
  CLICKED: 4,
  UNSUBSCRIBED: 5,
  FAILED: 10,
  BOUNCED: 10,
  SPAM: 10,
};

export function mapUnisenderStatus(
  status: string,
): RecipientStatus | null {
  switch (status) {
    case "accepted":
    case "sent":
      return "SENT";
    case "delivered":
      return "DELIVERED";
    case "opened":
      return "OPENED";
    case "clicked":
      return "CLICKED";
    case "unsubscribed":
      return "UNSUBSCRIBED";
    case "soft_bounced":
    case "hard_bounced":
      return "BOUNCED";
    case "spam":
      return "SPAM";
    default:
      return null;
  }
}

export function shouldUpgradeStatus(
  current: RecipientStatus,
  next: RecipientStatus,
): boolean {
  // allow moving to failure from non-failure
  if (
    (next === "FAILED" || next === "BOUNCED" || next === "SPAM") &&
    current !== "FAILED" &&
    current !== "BOUNCED" &&
    current !== "SPAM"
  ) {
    return true;
  }
  // don't downgrade success ladder
  if (
    (current === "FAILED" || current === "BOUNCED" || current === "SPAM") &&
    !(next === "FAILED" || next === "BOUNCED" || next === "SPAM")
  ) {
    return false;
  }
  return STATUS_RANK[next] >= STATUS_RANK[current];
}

export async function registerUnisenderWebhook(input: {
  apiKey: string;
  apiUrl: string;
  url: string;
}): Promise<{ ok: boolean; error?: string; raw?: unknown }> {
  const base = input.apiUrl.replace(/\/+$/, "");
  try {
    const res = await fetch(`${base}/webhook/set.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": input.apiKey,
      },
      body: JSON.stringify({
        url: input.url,
        status: "active",
        event_format: "json_post",
        delivery_info: 1,
        single_event: 0,
        max_parallel: 10,
        events: {
          email_status: [
            "sent",
            "delivered",
            "opened",
            "clicked",
            "unsubscribed",
            "subscribed",
            "soft_bounced",
            "hard_bounced",
            "spam",
          ],
        },
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      message?: string;
    } | null;
    if (!res.ok || data?.status === "error") {
      return {
        ok: false,
        error: data?.message || `HTTP ${res.status}`,
        raw: data,
      };
    }
    return { ok: true, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
