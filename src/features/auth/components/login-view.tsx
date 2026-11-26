"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BellRing, Clock, KeyRound, Loader2, Mail, ShieldCheck, Smartphone, TrendingDown, UserPlus } from "lucide-react";
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
import { GENDER_LABELS, GENDERS, type Gender } from "../schemas";
import { OtpInput } from "./otp-input";

interface Props {
  /** Which channels can deliver a code right now. */
  channels: { email: boolean; phone: boolean };
  /** Development only: codes are printed in the server console instead of being sent. */
  devLog: boolean;
  /** Supabase public URL + anon key, present only when Google sign-in is enabled. */
  google?: { url: string; anonKey: string };
  reason?: string;
  error?: string;
  next: string;
  idleMinutes: number;
}

type Channel = "email" | "phone";
type Mode = "signin" | "signup";

interface SignupForm {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: Gender | "";
}

const EMPTY_SIGNUP: SignupForm = { name: "", email: "", phone: "", dateOfBirth: "", gender: "" };

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

/** Latest allowed date of birth (13 years ago), as YYYY-MM-DD. */
function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 13);
  return d.toISOString().slice(0, 10);
}

const selectClass =
  "h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40";

export function LoginView({ channels, devLog, google: googleConfig, reason, error, next, idleMinutes }: Props) {
  const router = useRouter();
  const defaultChannel: Channel = !channels.email && channels.phone ? "phone" : "email";
  /** Mobile codes are offered only when an SMS provider is connected. */
  const showChannelChoice = channels.email && channels.phone;
  const [mode, setMode] = useState<Mode>("signin");
  const [step, setStep] = useState<"form" | "verify">("form");
  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [signup, setSignup] = useState<SignupForm>(EMPTY_SIGNUP);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ message: string; switchTo?: Mode } | null>(null);

  const anyChannel = channels.email || channels.phone;
  const channelReady = channels[channel];
  const destination = mode === "signin" ? (channel === "email" ? email : phone) : channel === "email" ? signup.email : signup.phone;

  function switchMode(m: Mode) {
    setMode(m);
    setStep("form");
    setFormError(null);
    setOtp("");
    if (m === "signup") setSignup((s) => ({ ...s, email: s.email || email, phone: s.phone || phone }));
    else {
      setEmail((v) => v || signup.email);
      setPhone((v) => v || signup.phone);
    }
  }

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) {
      const switchTo = err.code === "account_not_found" ? "signup" : err.code === "account_exists" ? "signin" : undefined;
      setFormError({ message: err.message, switchTo });
    } else setFormError({ message: fallback });
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setFormError(null);
    if (mode === "signup" && !signup.gender) return setFormError({ message: "Select a gender option" });
    setLoading(true);
    try {
      if (mode === "signin") {
        await api("/api/auth/otp/send", { method: "POST", json: channel === "email" ? { channel, email } : { channel, phone } });
      } else {
        await api("/api/auth/signup/send", { method: "POST", json: { channel, email: signup.email, phone: signup.phone } });
      }
      setStep("verify");
      setOtp("");
      toast.success(devLog ? "Developer mode: the code is in the server console" : `Code sent to ${destination}`);
    } catch (err) {
      fail(err, "Couldn't send the code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(e?: React.FormEvent) {
    e?.preventDefault();
    if (otp.length !== 6) return setFormError({ message: "Enter the 6-digit code" });
    setFormError(null);
    setLoading(true);
    try {
      if (mode === "signin") {
        const target = channel === "email" ? { email } : { phone };
        await api("/api/auth/otp/verify", { method: "POST", json: { channel, ...target, token: otp } });
        toast.success("Welcome back!");
      } else {
        await api("/api/auth/signup/verify", { method: "POST", json: { ...signup, channel, token: otp } });
        toast.success(`Welcome to PricePulse, ${signup.name.split(" ")[0]}!`);
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      fail(err, "Verification failed");
      setLoading(false);
    }
  }

  async function google() {
    const { createSupabaseBrowserClient } = await import("../supabase-browser");
    const supabase = createSupabaseBrowserClient(googleConfig?.url, googleConfig?.anonKey);
    if (!supabase) return toast.error("Google sign-in is not configured");
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
  }

  const channelTabs = (label: string) =>
    showChannelChoice ? (
      <div className="space-y-2">
        <Label>{label}</Label>
        <Tabs value={channel} onValueChange={(v) => { setChannel(v as Channel); setFormError(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email"><Mail aria-hidden /> Email</TabsTrigger>
            <TabsTrigger value="phone"><Smartphone aria-hidden /> Mobile</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    ) : mode === "signup" && channel === "email" && channels.email ? (
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Mail className="size-4" aria-hidden /> We&apos;ll email a 6-digit code to verify your email ID.
      </p>
    ) : null;

  const phoneInput = (id: string, value: string, onChange: (v: string) => void, autoFocus?: boolean) => (
    <div className="flex gap-2">
      <span className="grid h-11 place-items-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold" aria-hidden>🇮🇳 +91</span>
      <Input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={value} onChange={(e) => onChange(e.target.value)} required autoFocus={autoFocus} />
    </div>
  );

  const errorBox = formError && (
    <div role="alert" className="text-sm font-medium text-destructive">
      {formError.message}{" "}
      {formError.switchTo && (
        <button type="button" className="cursor-pointer font-semibold text-primary underline" onClick={() => switchMode(formError.switchTo!)}>
          {formError.switchTo === "signup" ? "Create an account" : "Go to Sign in"}
        </button>
      )}
    </div>
  );

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

          {step === "form" && (
            <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)} className="mb-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin"><KeyRound aria-hidden /> Sign in</TabsTrigger>
                <TabsTrigger value="signup"><UserPlus aria-hidden /> Sign up</TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          <h2 className="font-display text-3xl font-bold tracking-tight">
            {step === "verify" ? "Enter your code" : mode === "signin" ? "Welcome back" : "Create your profile"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {step === "verify"
              ? `We sent a 6-digit code to ${channel === "phone" ? `+91 ${destination.replace(/^\+91/, "")}` : destination}. It expires in 10 minutes.`
              : mode === "signin"
                ? "We'll send a one-time code to your email or mobile."
                : "First time here? Tell us a little about you, then verify with a one-time code."}
          </p>

          {reason === "expired" && step === "form" && (
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
          {devLog && (
            <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-sm text-sky-800 dark:text-sky-200" data-testid="dev-banner">
              <KeyRound className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span><b>Developer mode</b> – no email/SMS provider is configured, so codes are printed in the server console.</span>
            </div>
          )}
          {!anyChannel && (
            <div role="alert" className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="otp-unavailable">
              Sign-in codes can&apos;t be sent yet. The site owner needs to connect an email (Resend) or SMS (Twilio Verify) provider.
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "form" && mode === "signin" && (
              <motion.form key="signin" onSubmit={sendCode} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="mt-6 space-y-5" noValidate>
                {channelTabs("Sign in with")}
                {channel === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    {phoneInput("phone", phone, setPhone, true)}
                  </div>
                )}
                {errorBox}
                <Button type="submit" size="lg" className="w-full" disabled={loading || !(channel === "email" ? email : phone) || !channelReady}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Send OTP
                </Button>
                {googleConfig && (
                  <>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
                    </div>
                    <Button type="button" variant="outline" size="lg" className="w-full" onClick={google}>
                      <GoogleIcon /> Continue with Google
                    </Button>
                  </>
                )}
                <p className="text-center text-sm text-muted-foreground">
                  New to PricePulse?{" "}
                  <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => switchMode("signup")}>Create an account</button>
                </p>
              </motion.form>
            )}

            {step === "form" && mode === "signup" && (
              <motion.form key="signup" onSubmit={sendCode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-6 space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" autoComplete="name" placeholder="Priya Sharma" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} required autoFocus />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-phone">Mobile number</Label>
                  {phoneInput("su-phone", signup.phone, (v) => setSignup({ ...signup, phone: v }))}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email ID</Label>
                  <Input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-dob">Date of birth</Label>
                    <Input id="su-dob" type="date" autoComplete="bday" max={maxDob()} value={signup.dateOfBirth} onChange={(e) => setSignup({ ...signup, dateOfBirth: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-gender">Gender</Label>
                    <select id="su-gender" className={selectClass} value={signup.gender} onChange={(e) => setSignup({ ...signup, gender: e.target.value as Gender })} required>
                      <option value="" disabled>Select</option>
                      {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                    </select>
                  </div>
                </div>
                {channelTabs("Send verification code to")}
                {errorBox}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading || !channelReady || !signup.name || !signup.email || !signup.phone || !signup.dateOfBirth}
                >
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Continue
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => switchMode("signin")}>Sign in</button>
                </p>
              </motion.form>
            )}

            {step === "verify" && (
              <motion.form key="verify" onSubmit={verifyCode} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-6 space-y-5">
                <OtpInput value={otp} onChange={setOtp} disabled={loading} autoFocus />
                {errorBox}
                <Button type="submit" size="lg" className="w-full" disabled={loading || otp.length !== 6}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} {mode === "signup" ? "Verify & create account" : "Verify & sign in"}
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="inline-flex cursor-pointer items-center gap-1 text-muted-foreground hover:text-foreground" onClick={() => { setStep("form"); setFormError(null); }}>
                    <ArrowLeft className="size-4" aria-hidden /> {mode === "signup" ? "Edit details" : `Change ${channel === "email" ? "email" : "number"}`}
                  </button>
                  <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => sendCode()} disabled={loading}>
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
