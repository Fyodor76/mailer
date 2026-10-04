import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "mail_session";

export type SessionRole = "superadmin" | "user";

export type SessionUser = {
  login: string;
  role: SessionRole;
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars)");
  }
  return new TextEncoder().encode(secret);
}

export function timingSafeEqualString(a: string, b: string): boolean {
  if (!b) return false;
  let mismatch = a.length !== b.length ? 1 : 0;
  const max = Math.max(a.length, b.length);
  for (let i = 0; i < max; i++) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
}

export function normalizeLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function getSuperAdminCredentials(): { login: string; password: string } | null {
  const login = normalizeLogin(process.env.SUPER_ADMIN_LOGIN ?? "");
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  if (!login || !password) return null;
  return { login, password };
}

export function getLegacyAccountCredentials(): {
  login: string;
  password: string;
} | null {
  const login = normalizeLogin(process.env.APP_LOGIN ?? "operator");
  const password = process.env.APP_PASSWORD ?? "";
  if (!login || !password) return null;
  return { login, password };
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({
    auth: true,
    login: user.login,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const login = typeof payload.login === "string" ? payload.login : "";
    const role = payload.role === "superadmin" ? "superadmin" : "user";
    if (payload.role === "superadmin" || payload.role === "user") {
      return { login, role };
    }
    if (payload.auth === true) {
      return { login: login || "operator", role: "user" };
    }
    return null;
  } catch {
    return null;
  }
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null;
}

export async function isSuperAdmin(): Promise<boolean> {
  const session = await getSession();
  return session?.role === "superadmin";
}

export { COOKIE_NAME };
