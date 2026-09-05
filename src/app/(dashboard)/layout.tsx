import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDashboardAuthRedirect } from "@/lib/dashboard-auth";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const redirectTo = getDashboardAuthRedirect(session);
  if (!session) redirect(redirectTo ?? "/login");

  return (
    <DashboardShell
      currentUser={{
        id: session.userId,
        name: session.name,
        email: session.email,
        role: session.role,
        avatar: session.avatar,
      }}
    >
      {children}
    </DashboardShell>
  );
}
