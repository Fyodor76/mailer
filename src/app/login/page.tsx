import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Вход",
  description: "Вход в Mail Orchestrator",
};

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="panel login-card stack">
        <div className="login-brand">
          <svg
            width="40"
            height="40"
            viewBox="0 0 64 64"
            fill="none"
            aria-hidden
          >
            <rect width="64" height="64" rx="16" fill="#1F6B5A" />
            <path
              d="M14 22.5c0-1.4 1.1-2.5 2.5-2.5h31c1.4 0 2.5 1.1 2.5 2.5v19c0 1.4-1.1 2.5-2.5 2.5h-31c-1.4 0-2.5-1.1-2.5-2.5v-19z"
              stroke="#FFFCFF"
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
            <path
              d="M15.5 22.5 32 34.2 48.5 22.5"
              stroke="#FFFCFF"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="46" cy="18" r="5.5" fill="#D9ECE6" />
          </svg>
          <div>
            <h1>Mail Orchestrator</h1>
            <p className="muted" style={{ margin: 0 }}>
              Введите пароль, чтобы продолжить
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
