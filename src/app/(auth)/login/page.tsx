import type { Metadata } from "next";
import { env, isGoogleAuthEnabled, supabaseAnonKey, supabaseUrl } from "@/lib/env";
import { otpAvailability } from "@/server/auth/otp";
import { LoginView } from "@/features/auth/components/login-view";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a PricePulse India account with an email or mobile OTP to compare prices and set price-drop alerts.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string; next?: string; error?: string }> }) {
  const sp = await searchParams;
  const otp = otpAvailability();
  return (
    <LoginView
      channels={{ email: otp.email, phone: otp.phone }}
      devLog={otp.devLog}
      google={isGoogleAuthEnabled ? { url: supabaseUrl!, anonKey: supabaseAnonKey! } : undefined}
      reason={sp.reason}
      error={sp.error}
      next={sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/home"}
      idleMinutes={env.SESSION_IDLE_MINUTES}
    />
  );
}
