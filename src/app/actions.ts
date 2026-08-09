"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  isAuthenticated,
  verifyPassword,
} from "@/lib/auth";
import { parseEmailList, parseExcelBuffer } from "@/lib/parse-emails";
import { testUnisenderConnection } from "@/lib/unisender";

async function requireAuth() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    return { error: "Неверный пароль" };
  }
  await createSession();
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function saveProviderAction(formData: FormData) {
  await requireAuth();

  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  const fromEmail = String(formData.get("fromEmail") ?? "").trim();
  const fromName = String(formData.get("fromName") ?? "").trim();
  const replyTo = String(formData.get("replyTo") ?? "").trim() || null;
  const name = String(formData.get("name") ?? "Unisender Go").trim();
  const backendRaw = String(formData.get("customBackendId") ?? "").trim();
  const customBackendId = backendRaw
    ? Number.parseInt(backendRaw, 10)
    : null;
  if (backendRaw && (!Number.isFinite(customBackendId) || customBackendId! <= 0)) {
    return { error: "Backend ID домена ссылок должен быть положительным числом" };
  }

  if (!apiKey || !apiUrl || !fromEmail) {
    return { error: "API key, URL и from email обязательны" };
  }

  const existing = await prisma.provider.findFirst({
    where: { type: "UNISENDER_GO" },
  });

  const data = {
    apiKey,
    apiUrl,
    fromEmail,
    fromName,
    replyTo,
    name,
    customBackendId,
  };

  const provider = existing
    ? await prisma.provider.update({
        where: { id: existing.id },
        data,
      })
    : await prisma.provider.create({
        data: {
          type: "UNISENDER_GO",
          ...data,
        },
      });

  // Кампании, созданные до настройки провайдера
  await prisma.campaign.updateMany({
    where: { providerId: null },
    data: { providerId: provider.id },
  });

  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/campaigns", "layout");
  return { ok: true };
}

export async function testProviderAction(formData: FormData) {
  await requireAuth();
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  if (!apiKey || !apiUrl) {
    return { error: "Укажите API key и URL" };
  }
  return testUnisenderConnection({ apiKey, apiUrl });
}

export async function registerWebhookAction() {
  await requireAuth();

  const baseUrl = (process.env.APP_BASE_URL || "").replace(/\/+$/, "");
  if (!baseUrl || baseUrl.includes("localhost")) {
    return {
      error:
        "Укажите публичный APP_BASE_URL в .env (не localhost). Для локалки — ngrok/cloudflare tunnel.",
    };
  }

  const provider = await prisma.provider.findFirst({
    where: { type: "UNISENDER_GO" },
  });
  if (!provider) return { error: "Сначала сохраните провайдера" };

  const { registerUnisenderWebhook } = await import("@/lib/webhook");
  const webhookUrl = `${baseUrl}/api/webhooks/unisender`;
  const res = await registerUnisenderWebhook({
    apiKey: provider.apiKey,
    apiUrl: provider.apiUrl,
    url: webhookUrl,
  });

  if (!res.ok) return { error: res.error || "Не удалось зарегистрировать webhook" };
  return { ok: true, url: webhookUrl };
}

export async function createCampaignAction(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") ?? "").trim() || "Новый запуск";

  const provider = await prisma.provider.findFirst({
    where: { type: "UNISENDER_GO" },
  });

  const campaign = await prisma.campaign.create({
    data: {
      name,
      providerId: provider?.id,
      status: "DRAFT",
    },
  });

  redirect(`/campaigns/${campaign.id}`);
}

export async function updateCampaignAction(
  campaignId: string,
  formData: FormData,
) {
  await requireAuth();

  const name = String(formData.get("name") ?? "").trim();
  const subject = String(formData.get("subject") ?? "");
  const bodyHtml = String(formData.get("bodyHtml") ?? "");
  const bodyText = String(formData.get("bodyText") ?? "");
  const batchSize = Math.max(
    1,
    Math.min(500, Number(formData.get("batchSize") ?? 10) || 10),
  );
  const delayMs = Math.max(0, Number(formData.get("delayMs") ?? 1000) || 0);

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "Рассылка не найдена" };
  if (campaign.status === "RUNNING") {
    return { error: "Нельзя менять настройки во время отправки" };
  }

  const recipientCount = await prisma.recipient.count({
    where: { campaignId },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      name: name || campaign.name,
      subject,
      bodyHtml,
      bodyText,
      batchSize,
      delayMs,
      status:
        recipientCount > 0 && subject.trim()
          ? campaign.status === "DONE" || campaign.status === "FAILED"
            ? campaign.status
            : "READY"
          : "DRAFT",
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function importRecipientsAction(
  campaignId: string,
  formData: FormData,
) {
  await requireAuth();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "Рассылка не найдена" };
  if (campaign.status === "RUNNING") {
    return { error: "Нельзя импортировать во время отправки" };
  }

  const replace = formData.get("replace") === "on";
  const listText = String(formData.get("listText") ?? "");
  const file = formData.get("file");

  let parsed =
    listText.trim().length > 0
      ? parseEmailList(listText)
      : { recipients: [], totalFound: 0, uniqueCount: 0, invalidCount: 0 };

  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    parsed = parseExcelBuffer(buffer);
  }

  if (parsed.recipients.length === 0) {
    return { error: "Не найдено ни одного email" };
  }

  if (replace) {
    await prisma.recipient.deleteMany({ where: { campaignId } });
  }

  // createMany skipDuplicates via unique constraint
  const chunkSize = 500;
  for (let i = 0; i < parsed.recipients.length; i += chunkSize) {
    const chunk = parsed.recipients.slice(i, i + chunkSize);
    await prisma.recipient.createMany({
      data: chunk.map((r) => ({
        campaignId,
        email: r.email,
        label: r.label,
      })),
      skipDuplicates: true,
    });
  }

  const count = await prisma.recipient.count({ where: { campaignId } });
  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status:
        count > 0 && campaign.subject.trim()
          ? campaign.status === "DONE" || campaign.status === "FAILED"
            ? "READY"
            : "READY"
          : "DRAFT",
      finishedAt: null,
      errorMessage: null,
    },
  });

  // reset statuses if re-importing onto done campaign with replace
  if (replace) {
    // already all pending from create
  }

  revalidatePath(`/campaigns/${campaignId}`);
  return {
    ok: true,
    uniqueCount: parsed.uniqueCount,
    totalFound: parsed.totalFound,
    invalidCount: parsed.invalidCount,
  };
}

export async function startCampaignAction(campaignId: string) {
  await requireAuth();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { provider: true, _count: { select: { recipients: true } } },
  });
  if (!campaign) return { error: "Не найдена" };

  if (!campaign.provider) {
    const provider = await prisma.provider.findFirst({
      where: { type: "UNISENDER_GO" },
    });
    if (!provider) return { error: "Сначала настройте провайдера" };
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { providerId: provider.id },
    });
  }

  if (!campaign.subject.trim()) return { error: "Укажите тему письма" };
  if (campaign._count.recipients === 0) return { error: "Нет получателей" };

  // if restarting a done/failed — reset failed/pending only? keep sent, reset failed to pending optional
  // For simplicity: only send PENDING. User can re-queue failed separately.

  const pending = await prisma.recipient.count({
    where: { campaignId, status: "PENDING" },
  });
  if (pending === 0) {
    return { error: "Нет адресов в статусе «ожидает». Добавьте базу или сбросьте ошибки." };
  }

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: "RUNNING",
      startedAt: campaign.startedAt ?? new Date(),
      finishedAt: null,
      errorMessage: null,
    },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function pauseCampaignAction(campaignId: string) {
  await requireAuth();
  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "PAUSED" },
  });
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/");
  return { ok: true };
}

export async function resetFailedAction(campaignId: string) {
  await requireAuth();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "Не найдена" };
  if (campaign.status === "RUNNING") {
    return { error: "Сначала поставьте на паузу" };
  }

  await prisma.recipient.updateMany({
    where: {
      campaignId,
      status: { in: ["FAILED", "BOUNCED", "SPAM"] },
    },
    data: { status: "PENDING", error: null, providerJobId: null, sentAt: null, deliveryStatus: null, deliveredAt: null, openedAt: null },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: { status: "READY", finishedAt: null, errorMessage: null },
  });

  revalidatePath(`/campaigns/${campaignId}`);
  return { ok: true };
}

export async function deleteCampaignAction(campaignId: string) {
  await requireAuth();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
  });
  if (!campaign) return { error: "Не найдена" };
  if (campaign.status === "RUNNING") {
    return { error: "Сначала остановите отправку" };
  }
  await prisma.campaign.delete({ where: { id: campaignId } });
  redirect("/");
}
