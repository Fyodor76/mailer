import { AppHeader } from "@/components/AppHeader";
import {
  CreateAccountForm,
  DeleteAccountButton,
} from "@/components/CreateAccountForm";
import { isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Аккаунты",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isSuperAdmin())) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, login: true, createdAt: true },
  });

  return (
    <>
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <h1>Аккаунты</h1>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Super admin задаётся в .env. Здесь создаются обычные логины для входа
            </p>
          </div>
        </div>
        <div className="panel stack" style={{ maxWidth: 640 }}>
          <h2 style={{ fontSize: "1.1rem", margin: 0 }}>Новый аккаунт</h2>
          <CreateAccountForm />
        </div>
        <div className="panel" style={{ maxWidth: 640, marginTop: "1.25rem" }}>
          {users.length === 0 ? (
            <div className="empty">Пока нет созданных аккаунтов.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Логин</th>
                  <th>Создан</th>
                  <th style={{ width: 88 }} />
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <strong>{user.login}</strong>
                    </td>
                    <td className="muted">{formatDate(user.createdAt)}</td>
                    <td>
                      <DeleteAccountButton userId={user.id} login={user.login} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </>
  );
}
