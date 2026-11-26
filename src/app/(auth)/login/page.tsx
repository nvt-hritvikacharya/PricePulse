import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { env, isGoogleAuthEnabled, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-next";
import { getCurrentUser } from "@/features/auth/server/session";
import { LoginView } from "@/features/auth/components/login-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign up or sign in to PricePulse India with your email and password or mobile number and passcode.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getCurrentUser()) redirect(next);
  return (
    <LoginView
      google={isGoogleAuthEnabled ? { url: supabaseUrl!, anonKey: supabaseAnonKey! } : undefined}
      reason={sp.reason}
      error={sp.error}
      next={next}
      idleMinutes={env.SESSION_IDLE_MINUTES}
    />
  );
}
