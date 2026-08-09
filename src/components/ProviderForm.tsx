"use client";

import { useState, useTransition } from "react";
import {
  registerWebhookAction,
  saveProviderAction,
  testProviderAction,
} from "@/app/actions";
import { useToast } from "@/components/Toast";

type Props = {
  initial: {
    name: string;
    apiKey: string;
    apiUrl: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    customBackendId?: string;
  };
  webhookUrl: string;
};

export function ProviderForm({ initial, webhookUrl }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const backendDefault = initial.customBackendId ?? "37085";

  return (
    <div className="stack">
      <form
        className="stack"
        action={(fd) => {
          startTransition(async () => {
            setError(null);
            const res = await saveProviderAction(fd);
            if (res?.error) {
              setError(res.error);
              toast.error(res.error);
            } else {
              toast.success("Провайдер сохранён");
            }
          });
        }}
      >
        <label className="field">
          Название
          <input name="name" defaultValue={initial.name} />
        </label>
        <label className="field">
          API URL
          <input
            name="apiUrl"
            defaultValue={initial.apiUrl}
            placeholder="https://goapi.unisender.ru/ru/transactional/api/v1"
          />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            При необходимости замените на go1 / go2 endpoint вашего дата-центра
          </span>
        </label>
        <label className="field">
          API Key
          <input
            name="apiKey"
            type="password"
            defaultValue={initial.apiKey}
            required
            autoComplete="off"
          />
        </label>
        <div className="grid-2">
          <label className="field">
            From email
            <input
              name="fromEmail"
              type="email"
              defaultValue={initial.fromEmail}
              required
            />
          </label>
          <label className="field">
            From name
            <input name="fromName" defaultValue={initial.fromName} />
          </label>
        </div>
        <label className="field">
          Reply-To (опционально)
          <input name="replyTo" type="email" defaultValue={initial.replyTo} />
        </label>
        <label className="field">
          Backend ID домена ссылок
          <input
            name="customBackendId"
            type="number"
            min={1}
            step={1}
            defaultValue={backendDefault}
            placeholder="37085"
          />
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Unisender → Домены ссылок → Backend ID (например{" "}
            <code>37085</code> для email.websitesharing.ru). Без него берётся
            дефолт аккаунта (сейчас dealercms).
          </span>
        </label>

        <div className="row">
          <button className="btn" type="submit" disabled={pending}>
            Сохранить
          </button>
          <button
            className="btn btn-secondary"
            type="submit"
            formAction={(fd) => {
              startTransition(async () => {
                setError(null);
                const res = await testProviderAction(fd);
                if (res?.error || !("ok" in res && res.ok)) {
                  const msg = res?.error || "Проверка не прошла";
                  setError(msg);
                  toast.error(msg);
                } else {
                  toast.success("Подключение к API успешно");
                }
              });
            }}
            disabled={pending}
          >
            Проверить API
          </button>
        </div>
      </form>

      <div className="panel stack" style={{ padding: "1rem", marginTop: "0.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Вебхук статусов</h2>
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          Unisender будет слать delivered / opened / bounce сюда. Нужен
          публичный HTTPS URL в <code>APP_BASE_URL</code>.
        </p>
        <code className="webhook-url">{webhookUrl}</code>
        <button
          className="btn btn-secondary"
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              setError(null);
              const res = await registerWebhookAction();
              if (res?.error) {
                setError(res.error);
                toast.error(res.error);
              } else {
                toast.success("Webhook зарегистрирован в Unisender");
              }
            });
          }}
        >
          Зарегистрировать в Unisender
        </button>
      </div>

      {error ? <div className="alert">{error}</div> : null}
    </div>
  );
}
