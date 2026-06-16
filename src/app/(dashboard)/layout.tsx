import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardShell } from "@/components/layout/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { name, role, email } = session.user;

  return (
    <DashboardShell role={role ?? "student"} userName={name ?? email ?? ""}>
      {children}
    </DashboardShell>
  );
}
