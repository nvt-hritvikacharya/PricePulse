"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BellRing, Clock, KeyRound, Loader2, Mail, ShieldCheck, Smartphone, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoMark } from "@/components/shared/logo";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { RETAILER_IDS } from "@/features/retailers/retailers";
import { OtpInput } from "./otp-input";

interface Props {
  devMode: boolean;
  devCode?: string;
  authConfigured: boolean;
  googleEnabled: boolean;
  reason?: string;
  error?: string;
  next: string;
  idleMinutes: number;
}

type Channel = "email" | "phone";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function LoginView({ devMode, devCode, authConfigured, googleEnabled, reason, error, next, idleMinutes }: Props) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>("email");
  const [step, setStep] = useState<"identify" | "verify">("identify");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const identifier = channel === "email" ? email : phone;
  const payload = channel === "email" ? { channel, email } : { channel, phone };

  async function sendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      await api("/api/auth/otp/send", { method: "POST", json: payload });
      setStep("verify");
      setOtp("");
      toast.success(devMode ? `Dev mode: use code ${devCode}` : `Code sent to ${identifier}`);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length !== 6) return setFormError("Enter the 6-digit code");
    setFormError(null);
    setLoading(true);
    try {
      await api("/api/auth/otp/verify", { method: "POST", json: { ...payload, token: otp } });
      toast.success("Welcome to PricePulse!");
      router.replace(next);
      router.refresh();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Verification failed");
      setLoading(false);
    }
  }

  async function google() {
    const { createSupabaseBrowserClient } = await import("../supabase-browser");
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return toast.error("Google sign-in is not configured");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  return (
    <main id="main" className="relative grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Brand / value panel */}
      <section className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12" aria-label="About PricePulse India">
        <div className="absolute inset-0 bg-brand-gradient opacity-[0.92]" />
        <div className="absolute -top-24 -left-24 size-96 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 size-[28rem] rounded-full bg-violet-900/40 blur-3xl" />
        <div className="relative flex items-center gap-3 text-white">
          <LogoMark className="size-11 ring-2 ring-white/40 rounded-2xl" />
          <span className="font-display text-2xl font-extrabold">PricePulse India</span>
        </div>
        <div className="relative max-w-lg text-white">
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="font-display text-5xl leading-[1.05] font-extrabold tracking-tight">
            Never overpay.
            <br />
            Compare 13 stores in one search.
          </motion.h1>
          <p className="mt-5 text-lg text-white/85">Live prices, delivery times and 90-day price history across India&apos;s favourite shopping apps – with alerts the moment prices drop.</p>
          <ul className="mt-8 grid gap-3 text-white/95">
            {[
              { icon: TrendingDown, t: "Price history & lowest-ever tracking" },
              { icon: BellRing, t: "Email + push alerts at your target price" },
              { icon: ShieldCheck, t: "Official APIs – no shady scraping" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-5" aria-hidden />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative flex flex-wrap gap-2" aria-label="Supported stores">
          {RETAILER_IDS.map((r, i) => (
            <motion.span key={r} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.04 }} className="rounded-xl bg-white/90 p-1 shadow-lg">
              <RetailerLogo retailer={r} size="md" />
            </motion.span>
          ))}
        </div>
      </section>

      {/* Auth card */}
      <section className="flex items-center justify-center p-5 sm:p-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="glass w-full max-w-md rounded-3xl p-7 shadow-2xl sm:p-9">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <LogoMark />
            <span className="font-display text-xl font-extrabold">PricePulse India</span>
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight">{step === "identify" ? "Sign in" : "Enter your code"}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {step === "identify" ? "Use a one-time password – no passwords to remember." : `We sent a 6-digit code to ${identifier}.`}
          </p>

          {reason === "expired" && (
            <div role="status" className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              You were signed out after {idleMinutes} minutes of inactivity. Please sign in again.
            </div>
          )}
          {error === "oauth" && (
            <div role="alert" className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Google sign-in failed. Please try again or use OTP.
            </div>
          )}
          {devMode && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-800 dark:text-sky-200" data-testid="dev-banner">
              <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <b>Developer mode</b> – Supabase keys aren&apos;t set, so no OTP is sent. Use any email/phone and code <b className="font-mono">{devCode}</b>.
              </span>
            </div>
          )}
          {!authConfigured && (
            <div role="alert" className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Authentication isn&apos;t configured. Set Supabase keys in the environment.
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "identify" ? (
              <motion.form key="identify" onSubmit={sendOtp} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="mt-6 space-y-5" noValidate>
                <Tabs value={channel} onValueChange={(v) => { setChannel(v as Channel); setFormError(null); }}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="email"><Mail aria-hidden /> Email</TabsTrigger>
                    <TabsTrigger value="phone"><Smartphone aria-hidden /> Mobile</TabsTrigger>
                  </TabsList>
                </Tabs>
                {channel === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={Boolean(formError)} autoFocus />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    <div className="flex gap-2">
                      <span className="grid h-11 place-items-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold" aria-hidden>🇮🇳 +91</span>
                      <Input id="phone" type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} required aria-invalid={Boolean(formError)} autoFocus />
                    </div>
                  </div>
                )}
                {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading || !identifier || !authConfigured}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Send OTP
                </Button>
                {googleEnabled && (
                  <>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
                      <GoogleIcon /> Continue with Google
                    </Button>
                  </>
                )}
              </motion.form>
            ) : (
              <motion.form key="verify" onSubmit={verifyOtp} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-6 space-y-5">
                <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
                {formError && <p role="alert" className="text-sm font-medium text-destructive">{formError}</p>}
                <Button type="submit" size="lg" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Verify & continue
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => { setStep("identify"); setFormError(null); }}>
                    <ArrowLeft className="size-4" aria-hidden /> Change {channel === "email" ? "email" : "number"}
                  </button>
                  <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => sendOtp()} disabled={loading}>
                    Resend code
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Sessions end after {idleMinutes} minutes of inactivity. By continuing you agree to our Terms & Privacy Policy.
          </p>
        </motion.div>
      </section>
    </main>
  );
}
