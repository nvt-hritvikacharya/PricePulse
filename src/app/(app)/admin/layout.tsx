import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { AdminNav } from "@/features/admin/components/admin-nav";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") redirect("/home");
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Admin panel</h1>
        <p className="text-muted-foreground">Usage, search insights and provider health.</p>
      </div>
      <AdminNav />
      {children}
    </div>
  );
}
