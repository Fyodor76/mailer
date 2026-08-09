export type UnisenderRecipient = {
  email: string;
  substitutions?: Record<string, string>;
  metadata?: Record<string, string>;
};

export type UnisenderSendInput = {
  apiKey: string;
  apiUrl: string;
  fromEmail: string;
  fromName?: string;
  replyTo?: string | null;
  /** Backend ID домена ссылок (custom_backend_id в Unisender Go) */
  customBackendId?: number | null;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  recipients: UnisenderRecipient[];
  campaignId?: string;
};

export type UnisenderSendResult = {
  ok: boolean;
  jobId?: string;
  emails: string[];
  failedEmails: Record<string, string>;
  error?: string;
  raw?: unknown;
};

function normalizeBaseUrl(apiUrl: string) {
  return apiUrl.replace(/\/+$/, "");
}

export async function sendUnisenderEmail(
  input: UnisenderSendInput,
): Promise<UnisenderSendResult> {
  const base = normalizeBaseUrl(input.apiUrl);
  const url = `${base}/email/send.json`;

  const body: Record<string, unknown> = {
    html: input.bodyHtml || undefined,
    plaintext: input.bodyText || undefined,
  };

  if (!body.html && !body.plaintext) {
    body.plaintext = input.subject || "(empty)";
  }

  const message: Record<string, unknown> = {
    recipients: input.recipients.map((r) => ({
      email: r.email,
      substitutions: r.substitutions,
      metadata: {
        ...(r.metadata ?? {}),
        ...(input.campaignId
          ? {
              // custom key — Unisender system campaign_id wants UUID/int
              mail_campaign_id: input.campaignId,
            }
          : {}),
      },
    })),
    subject: input.subject,
    from_email: input.fromEmail,
    from_name: input.fromName || undefined,
    reply_to: input.replyTo || undefined,
    body,
  };

  if (input.customBackendId != null && Number.isFinite(input.customBackendId)) {
    message.options = { custom_backend_id: input.customBackendId };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": input.apiKey,
      },
      body: JSON.stringify({ message }),
    });

    const data = (await res.json().catch(() => null)) as
      | {
          status?: string;
          job_id?: string;
          emails?: string[];
          failed_emails?: Record<string, string>;
          message?: string;
          code?: number;
        }
      | null;

    if (!res.ok || data?.status === "error") {
      return {
        ok: false,
        emails: [],
        failedEmails: {},
        error: data?.message || `HTTP ${res.status}`,
        raw: data,
      };
    }

    return {
      ok: true,
      jobId: data?.job_id,
      emails: data?.emails ?? [],
      failedEmails: data?.failed_emails ?? {},
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      emails: [],
      failedEmails: {},
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

export async function testUnisenderConnection(input: {
  apiKey: string;
  apiUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const base = normalizeBaseUrl(input.apiUrl);
  // lightweight call: template/list with limit 1
  try {
    const res = await fetch(`${base}/template/list.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-API-KEY": input.apiKey,
      },
      body: JSON.stringify({ limit: 1, offset: 0 }),
    });
    const data = (await res.json().catch(() => null)) as {
      status?: string;
      message?: string;
    } | null;
    if (!res.ok || data?.status === "error") {
      return { ok: false, error: data?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
