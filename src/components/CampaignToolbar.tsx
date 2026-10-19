"use client";

import { useState, useTransition } from "react";
import {
  pauseCampaignAction,
  resetFailedAction,
  startCampaignAction,
  deleteCampaignAction,
} from "@/app/actions";
import { useToast } from "@/components/Toast";

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type ToolbarProps = {
  campaignId: string;
  status: string;
  pendingCount: number;
  failedCount: number;
  hasSubject: boolean;
};

export function CampaignToolbar({
  campaignId,
  status,
  pendingCount,
  failedCount,
  hasSubject,
}: ToolbarProps) {
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  function run(
    fn: () => Promise<{ error?: string; ok?: boolean } | void>,
    okMessage: string,
  ) {
    startTransition(async () => {
      setErr(null);
      const res = await fn();
      if (res && "error" in res && res.error) {
        setErr(res.error);
        toast.error(res.error);
        return;
      }
      toast.success(okMessage);
    });
  }

  const canStart =
    pendingCount > 0 &&
    hasSubject &&
    (status === "READY" ||
      status === "PAUSED" ||
      status === "DRAFT" ||
      status === "DONE" ||
      status === "FAILED");

  const showStartButton = status !== "RUNNING";
  const canDelete = status !== "RUNNING";

  let startHint = "";
  if (showStartButton && !canStart) {
    if (!hasSubject) startHint = "Сначала укажите тему письма";
    else if (pendingCount === 0 && failedCount > 0)
      startHint = "Все адреса с ошибкой — нажмите «Повторить ошибки»";
    else if (pendingCount === 0)
      startHint = "Сначала сохраните базу адресов";
  }

  return (
    <div className="stack" style={{ alignItems: "flex-end", gap: "0.5rem" }}>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {showStartButton ? (
          <button
            className="btn"
            type="button"
            disabled={pending || !canStart}
            title={startHint || undefined}
            onClick={() =>
              run(
                () => startCampaignAction(campaignId),
                status === "PAUSED"
                  ? "Рассылка продолжена"
                  : "Рассылка запущена",
              )
            }
          >
            {status === "PAUSED" ? "Продолжить" : "Запустить"}
          </button>
        ) : null}

        {status === "RUNNING" ? (
          <button
            className="btn btn-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => pauseCampaignAction(campaignId), "Рассылка на паузе")
            }
          >
            Пауза
          </button>
        ) : null}

        {failedCount > 0 && status !== "RUNNING" ? (
          <button
            className="btn btn-secondary"
            type="button"
            disabled={pending}
            onClick={() =>
              run(
                () => resetFailedAction(campaignId),
                "Ошибки сброшены — можно запускать снова",
              )
            }
          >
            Повторить ошибки
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            className="btn-icon"
            title="Удалить"
            aria-label="Удалить рассылку"
            disabled={pending}
            onClick={() => {
              if (confirm("Удалить эту рассылку?")) {
                run(() => deleteCampaignAction(campaignId), "Рассылка удалена");
              }
            }}
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
      {startHint ? (
        <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
          {startHint}
        </p>
      ) : null}
      {err ? (
        <div className="alert" style={{ width: "100%", maxWidth: 360 }}>
          {err}
        </div>
      ) : null}
    </div>
  );
}

export function DeleteCampaignButton({
  campaignId,
  disabled,
  name,
}: {
  campaignId: string;
  disabled?: boolean;
  name?: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  if (disabled) {
    return (
      <button
        type="button"
        className="btn-icon"
        disabled
        title="Нельзя удалить во время отправки"
        aria-label="Удалить недоступно"
      >
        <TrashIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="btn-icon"
      title="Удалить"
      aria-label={`Удалить ${name ?? "рассылку"}`}
      disabled={pending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (confirm(`Удалить «${name ?? "рассылку"}»?`)) {
          startTransition(async () => {
            await deleteCampaignAction(campaignId);
            toast.success("Рассылка удалена");
          });
        }
      }}
    >
      <TrashIcon />
    </button>
  );
}
