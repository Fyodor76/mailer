"use client";

import { useRef, useState, useTransition } from "react";
import { updateProfileAction } from "@/app/actions";
import { useToast } from "@/components/Toast";

export function ProfileForm({ login }: { login: string }) {
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
          const res = await updateProfileAction(fd);
          if (res?.error) {
            setError(res.error);
            toast.error(res.error);
            return;
          }
          toast.success("Профиль сохранён");
          const form = formRef.current;
          if (form) {
            const current = form.elements.namedItem("currentPassword");
            const next = form.elements.namedItem("password");
            if (current instanceof HTMLInputElement) current.value = "";
            if (next instanceof HTMLInputElement) next.value = "";
          }
        });
      }}
    >
      <label className="field">
        Логин
        <input
          type="text"
          name="login"
          required
          defaultValue={login}
          autoComplete="username"
        />
      </label>
      <label className="field">
        Текущий пароль
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
        />
      </label>
      <label className="field">
        Новый пароль
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="оставьте пустым, если не меняете"
        />
      </label>
      {error ? <div className="alert">{error}</div> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Сохранение…" : "Сохранить"}
      </button>
    </form>
  );
}
