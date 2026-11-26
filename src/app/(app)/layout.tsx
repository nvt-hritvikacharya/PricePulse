import { redirect } from "next/navigation";
import { getCurrentUser } from "@/features/auth/server/session";
import { AppHeader } from "@/components/layout/app-header";
import { SessionGuard } from "@/features/auth/components/session-guard";
import { isDemoMode } from "@/server/providers/registry";
import { idleSeconds } from "@/features/auth/session-token";

/** Authenticated shell. Server-validates the session (incl. revocation) on every navigation. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?reason=expired");
  return (
    <div className="flex min-h-dvh flex-col">
      <SessionGuard initialExpiresAt={user.expiresAt} idleMs={idleSeconds() * 1000} />
      <AppHeader user={{ name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatarUrl, role: user.role }} demoMode={isDemoMode()} />
      <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-12">
        {children}
      </main>
      <footer className="hidden border-t border-border py-6 text-center text-xs text-muted-foreground md:block">
        © {new Date().getFullYear()} PricePulse India · Prices via official retailer & aggregator APIs · Prices may change at checkout
      </footer>
    </div>
  );
}
