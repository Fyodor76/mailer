import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db";
import {
  getLegacyAccountCredentials,
  getSuperAdminCredentials,
  normalizeLogin,
} from "@/lib/auth";

const LOGIN_RE = /^[a-z0-9][a-z0-9._-]{1,62}$/;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const sep = stored.indexOf(":");
  if (sep <= 0) return false;
  const salt = stored.slice(0, sep);
  const expectedHex = stored.slice(sep + 1);
  const actualHex = scryptSync(password, salt, 64).toString("hex");
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length !== actual.length || expected.length === 0) return false;
  return timingSafeEqual(expected, actual);
}

export function validateLogin(login: string): string | null {
  const normalized = normalizeLogin(login);
  if (!LOGIN_RE.test(normalized)) {
    return "Логин: 2–63 символа, латиница, цифры, точка, _ или -";
  }
  const superAdmin = getSuperAdminCredentials();
  if (superAdmin && normalized === superAdmin.login) {
    return "Этот логин зарезервирован для super admin";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 6) return "Пароль должен быть не короче 6 символов";
  return null;
}

export async function ensureLegacyAccount() {
  const legacy = getLegacyAccountCredentials();
  if (!legacy) return;
  const superAdmin = getSuperAdminCredentials();
  if (superAdmin && legacy.login === superAdmin.login) return;

  const existing = await prisma.user.findUnique({
    where: { login: legacy.login },
  });
  if (existing) return;

  try {
    await prisma.user.create({
      data: {
        login: legacy.login,
        passwordHash: hashPassword(legacy.password),
      },
    });
  } catch {
    // unique race: already created
  }
}

export async function findUserByLogin(login: string) {
  return prisma.user.findUnique({
    where: { login: normalizeLogin(login) },
  });
}
