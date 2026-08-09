import Link from "next/link";
import { logoutAction } from "@/app/actions";

function BrandMark() {
  return (
    <svg
      className="brand-mark"
      width="28"
      height="28"
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
  );
}

export function AppHeader() {
  return (
    <header className="shell topbar">
      <Link href="/" className="brand">
        <BrandMark />
        <span>Mail Orchestrator</span>
      </Link>
      <nav className="nav">
        <Link href="/" className="nav-link">
          Рассылки
        </Link>
        <Link href="/settings" className="nav-link">
          Провайдер
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="btn btn-ghost">
            Выйти
          </button>
        </form>
      </nav>
    </header>
  );
}
