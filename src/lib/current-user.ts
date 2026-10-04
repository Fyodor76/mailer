import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { findUserByLogin } from "@/lib/users";

export async function getAppUser() {
  const session = await getSession();
  if (!session || session.role === "superadmin") return null;

  if (session.userId) {
    const byId = await prisma.user.findUnique({ where: { id: session.userId } });
    if (byId) return byId;
  }

  return findUserByLogin(session.login);
}

export async function requireAppUser() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role === "superadmin") redirect("/admin");

  const user = await getAppUser();
  if (!user) redirect("/login");
  return user;
}

export async function getOwnedCampaign(userId: string, campaignId: string) {
  return prisma.campaign.findFirst({
    where: { id: campaignId, userId },
  });
}
