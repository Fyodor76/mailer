import { AppHeader } from "@/components/AppHeader";
import { ProviderForm } from "@/components/ProviderForm";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Провайдер",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const provider = await prisma.provider.findFirst({
    where: { type: "UNISENDER_GO" },
  });

  const base = (process.env.APP_BASE_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
  const webhookUrl = `${base}/api/webhooks/unisender`;

  return (
    <>
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <h1>Провайдер</h1>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Unisender Go — токен, отправитель и вебхук
            </p>
          </div>
        </div>
        <div className="panel" style={{ maxWidth: 640 }}>
          <ProviderForm
            webhookUrl={webhookUrl}
            initial={{
              name: provider?.name ?? "Unisender Go",
              apiKey: provider?.apiKey ?? "",
              apiUrl:
                provider?.apiUrl ??
                "https://goapi.unisender.ru/ru/transactional/api/v1",
              fromEmail: provider?.fromEmail ?? "",
              fromName: provider?.fromName ?? "",
              replyTo: provider?.replyTo ?? "",
              customBackendId:
                provider?.customBackendId != null
                  ? String(provider.customBackendId)
                  : "37085",
            }}
          />
        </div>
      </main>
    </>
  );
}
