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
        Логин
        <input
          type="text"
          name="login"
          autoFocus
          required
          autoComplete="username"
          placeholder="operator"
        />
      </label>
      <label className="field">
        Пароль
        <input
          type="password"
          name="password"
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
