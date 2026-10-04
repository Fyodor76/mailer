import { AppHeader } from "@/components/AppHeader";
import { ProfileForm } from "@/components/ProfileForm";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Профиль",
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSuperAdmin = session.role === "superadmin";

  return (
    <>
      <AppHeader />
      <main className="shell" style={{ paddingBottom: "3rem" }}>
        <div className="page-title">
          <div>
            <h1>Профиль</h1>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              {isSuperAdmin
                ? "Учётные данные super admin задаются в .env"
                : "Смена логина и пароля для входа"}
            </p>
          </div>
        </div>
        <div className="panel" style={{ maxWidth: 640 }}>
          {isSuperAdmin ? (
            <p className="muted" style={{ margin: 0 }}>
              Логин и пароль super admin хранятся в{" "}
              <code>SUPER_ADMIN_LOGIN</code> и <code>SUPER_ADMIN_PASSWORD</code>.
              После правки .env пересоздайте контейнер app.
            </p>
          ) : (
            <ProfileForm key={session.login} login={session.login} />
          )}
        </div>
      </main>
    </>
  );
}
