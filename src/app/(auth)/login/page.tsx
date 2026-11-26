import type { Metadata } from "next";
import { env, isDevAuthEnabled, isSupabaseConfigured } from "@/lib/env";
import { LoginView } from "@/features/auth/components/login-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to PricePulse India with an email or mobile OTP to compare prices and set price-drop alerts.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <LoginView
      devMode={isDevAuthEnabled}
      devCode={isDevAuthEnabled ? env.DEV_OTP_CODE : undefined}
      authConfigured={isSupabaseConfigured || isDevAuthEnabled}
      googleEnabled={isSupabaseConfigured && process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true"}
      reason={sp.reason}
      error={sp.error}
      next={sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/home"}
      idleMinutes={env.SESSION_IDLE_MINUTES}
    />
  );
}
