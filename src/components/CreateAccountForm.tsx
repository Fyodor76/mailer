"use client";

import { useRef, useState, useTransition } from "react";
import { createAccountAction, deleteAccountAction, updateAccountAction } from "@/app/actions";
import { useToast } from "@/components/Toast";

export function CreateAccountForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      className="stack"
      action={(fd) => {
        startTransition(async () => {
          setError(null);
          const res = await createAccountAction(fd);
          if (res?.error) {
            setError(res.error);
            toast.error(res.error);
            return;
          }
          toast.success("Аккаунт создан");
          formRef.current?.reset();
        });
      }}
    >
      <div className="grid-2">
        <label className="field">
          Логин
          <input
            type="text"
            name="login"
            required
            autoComplete="off"
            placeholder="operator2"
          />
        </label>
        <label className="field">
          Пароль
          <input
            type="password"
            name="password"
            required
            autoComplete="new-password"
            placeholder="не короче 6 символов"
          />
        </label>
      </div>
      {error ? <div className="alert">{error}</div> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Создание…" : "Создать аккаунт"}
      </button>
    </form>
  );
}

export function DeleteAccountButton({
  userId,
  login,
}: {
  userId: string;
  login: string;
}) {
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <button
      type="button"
      className="btn btn-ghost"
      disabled={pending}
      aria-label={`Удалить ${login}`}
      onClick={() => {
        if (!confirm(`Удалить аккаунт «${login}»?`)) return;
        startTransition(async () => {
          const res = await deleteAccountAction(userId);
          if (res?.error) {
            toast.error(res.error);
            return;
          }
          toast.success("Аккаунт удалён");
        });
      }}
    >
      {pending ? "…" : "Удалить"}
    </button>
  );
}

export function EditAccountForm({
  userId,
  login,
}: {
  userId: string;
  login: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const toast = useToast();

  return (
    <form
      className="stack"
      action={(fd) => {
        startTransition(async () => {
          setError(null);
          const res = await updateAccountAction(userId, fd);
          if (res?.error) {
            setError(res.error);
            toast.error(res.error);
            return;
          }
          toast.success("Аккаунт обновлён");
        });
      }}
    >
      <div className="grid-2">
        <label className="field">
          Логин
          <input
            type="text"
            name="login"
            required
            defaultValue={login}
            autoComplete="off"
          />
        </label>
        <label className="field">
          Новый пароль
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            placeholder="пусто — без изменений"
          />
        </label>
      </div>
      {error ? <div className="alert">{error}</div> : null}
      <div className="row">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? "Сохранение…" : "Сохранить"}
        </button>
        <DeleteAccountButton userId={userId} login={login} />
      </div>
    </form>
  );
}
