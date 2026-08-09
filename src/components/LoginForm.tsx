"use client";

import { useState, useTransition } from "react";
import { loginAction } from "@/app/actions";

export function LoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="stack"
      action={(fd) => {
        startTransition(async () => {
          const res = await loginAction(fd);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <label className="field">
        Пароль
        <input
          type="password"
          name="password"
          autoFocus
          required
          autoComplete="current-password"
          placeholder="••••••••"
        />
      </label>
      {error ? <div className="alert">{error}</div> : null}
      <button className="btn" type="submit" disabled={pending}>
        {pending ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
