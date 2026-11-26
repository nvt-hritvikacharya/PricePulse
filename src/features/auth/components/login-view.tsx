"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Clock, Eye, EyeOff, KeyRound, Loader2, Mail, ShieldCheck, Smartphone, TrendingDown, UserPlus } from "lucide-react";
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

interface Props {
  /** Supabase public URL + anon key, present only when Google sign-in is enabled. */
  google?: { url: string; anonKey: string };
  reason?: string;
  error?: string;
  next: string;
  idleMinutes: number;
}

type Method = "email" | "phone";
type Mode = "signin" | "signup";

interface SignupForm {
  name: string;
  email: string;
  phone: string;
  secret: string;
  confirm: string;
  dateOfBirth: string;
  gender: Gender | "";
}

const EMPTY_SIGNUP: SignupForm = { name: "", email: "", phone: "", secret: "", confirm: "", dateOfBirth: "", gender: "" };

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

const digitsOnly = (v: string) => v.replace(/\D/g, "").slice(0, 6);

function SecretInput({ id, label, value, onChange, method, autoComplete, autoFocus }: { id: string; label: string; value: string; onChange: (v: string) => void; method: Method; autoComplete: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          inputMode={method === "phone" ? "numeric" : undefined}
          maxLength={method === "phone" ? 6 : 128}
          placeholder={method === "phone" ? "6-digit passcode" : "••••••••"}
          value={value}
          onChange={(e) => onChange(method === "phone" ? digitsOnly(e.target.value) : e.target.value)}
          className="pr-11"
          required
          autoFocus={autoFocus}
        />
        <button type="button" onClick={() => setVisible((v) => !v)} className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}>
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function LoginView({ google: googleConfig, reason, error, next, idleMinutes }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [method, setMethod] = useState<Method>("email");
  const [signin, setSignin] = useState({ email: "", phone: "", secret: "" });
  const [signup, setSignup] = useState<SignupForm>(EMPTY_SIGNUP);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<{ message: string; switchTo?: Mode } | null>(
    error === "account_exists" ? { message: "An account with this email already exists. Sign in with its password.", switchTo: undefined } : null,
  );

  function switchMode(m: Mode) {
    setMode(m);
    setFormError(null);
    if (m === "signup") setSignup((s) => ({ ...s, email: s.email || signin.email, phone: s.phone || signin.phone, secret: "", confirm: "" }));
    else setSignin((s) => ({ email: s.email || signup.email, phone: s.phone || signup.phone, secret: "" }));
  }

  function switchMethod(m: Method) {
    setMethod(m);
    setFormError(null);
    setSignin((s) => ({ ...s, secret: "" }));
    setSignup((s) => ({ ...s, secret: "", confirm: "" }));
  }

  function fail(err: unknown, fallback: string) {
    if (err instanceof ApiError) setFormError({ message: err.message, switchTo: err.code === "account_exists" ? "signin" : undefined });
    else setFormError({ message: fallback });
    setLoading(false);
  }

  async function onSignin(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const body = method === "email" ? { method, email: signin.email, secret: signin.secret } : { method, phone: signin.phone, secret: signin.secret };
      await api("/api/auth/signin", { method: "POST", json: body });
      toast.success("Welcome back!");
      router.replace(next);
      router.refresh();
    } catch (err) {
      fail(err, "Couldn't sign you in. Try again.");
    }
  }

  async function onSignup(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!signup.gender) return setFormError({ message: "Select a gender option" });
    if (signup.secret !== signup.confirm) return setFormError({ message: method === "email" ? "Passwords don't match" : "Passcodes don't match" });
    setLoading(true);
    try {
      const { name, email, phone, secret, dateOfBirth, gender } = signup;
      await api("/api/auth/signup", { method: "POST", json: { method, name, email, phone, secret, dateOfBirth, gender } });
      toast.success(`Welcome to PricePulse, ${signup.name.split(" ")[0]}!`);
      router.replace(next);
      router.refresh();
    } catch (err) {
      fail(err, "Couldn't create your account. Try again.");
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

  const methodTabs = (signupLabels: boolean) => (
    <Tabs value={method} onValueChange={(v) => switchMethod(v as Method)}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="email"><Mail aria-hidden /> {signupLabels ? "Email + password" : "Email"}</TabsTrigger>
        <TabsTrigger value="phone"><Smartphone aria-hidden /> {signupLabels ? "Mobile + passcode" : "Mobile"}</TabsTrigger>
      </TabsList>
    </Tabs>
  );

  const phoneInput = (id: string, value: string, onChange: (v: string) => void, autoFocus?: boolean, required = true) => (
    <div className="flex gap-2">
      <span className="grid h-11 place-items-center rounded-xl border border-input bg-muted px-3 text-sm font-semibold" aria-hidden>🇮🇳 +91</span>
      <Input id={id} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="98765 43210" value={value} onChange={(e) => onChange(e.target.value)} required={required} autoFocus={autoFocus} />
    </div>
  );

  const errorBox = formError && (
    <div role="alert" className="text-sm font-medium text-destructive">
      {formError.message}{" "}
      {formError.switchTo && (
        <button type="button" className="cursor-pointer font-semibold text-primary underline" onClick={() => switchMode(formError.switchTo!)}>
          Go to Sign in
        </button>
      )}
    </div>
  );

  const signupReady =
    signup.name && signup.dateOfBirth && signup.secret && signup.confirm && (method === "email" ? signup.email : signup.phone);

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

          <Tabs value={mode} onValueChange={(v) => switchMode(v as Mode)} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin"><KeyRound aria-hidden /> Sign in</TabsTrigger>
              <TabsTrigger value="signup"><UserPlus aria-hidden /> Sign up</TabsTrigger>
            </TabsList>
          </Tabs>

          <h2 className="font-display text-3xl font-bold tracking-tight">{mode === "signin" ? "Welcome back" : "Create your profile"}</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in with your email and password, or your mobile number and passcode." : "Sign up with your email ID and a password, or your mobile number and a 6-digit passcode."}
          </p>

          {reason === "expired" && (
            <div role="status" className="mt-5 flex items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              You were signed out after {idleMinutes} minutes of inactivity. Please sign in again.
            </div>
          )}
          {error === "oauth" && (
            <div role="alert" className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              Google sign-in failed. Please try again or use your password.
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === "signin" ? (
              <motion.form key="signin" onSubmit={onSignin} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="mt-6 space-y-5" noValidate>
                {methodTabs(false)}
                {method === "email" ? (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email ID</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={signin.email} onChange={(e) => setSignin({ ...signin, email: e.target.value })} required autoFocus />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Mobile number</Label>
                    {phoneInput("phone", signin.phone, (v) => setSignin({ ...signin, phone: v }), true)}
                  </div>
                )}
                <SecretInput id="secret" label={method === "email" ? "Password" : "Passcode"} value={signin.secret} onChange={(v) => setSignin({ ...signin, secret: v })} method={method} autoComplete="current-password" />
                {errorBox}
                <Button type="submit" size="lg" className="w-full" disabled={loading || !signin.secret || !(method === "email" ? signin.email : signin.phone)}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Sign in
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
            ) : (
              <motion.form key="signup" onSubmit={onSignup} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} className="mt-6 space-y-4" noValidate>
                {methodTabs(true)}
                <div className="space-y-2">
                  <Label htmlFor="su-name">Full name</Label>
                  <Input id="su-name" autoComplete="name" placeholder="Priya Sharma" value={signup.name} onChange={(e) => setSignup({ ...signup, name: e.target.value })} required autoFocus />
                </div>
                {method === "email" ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Email ID</Label>
                      <Input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SecretInput id="su-secret" label="Password" value={signup.secret} onChange={(v) => setSignup({ ...signup, secret: v })} method="email" autoComplete="new-password" />
                      <SecretInput id="su-confirm" label="Confirm password" value={signup.confirm} onChange={(v) => setSignup({ ...signup, confirm: v })} method="email" autoComplete="new-password" />
                    </div>
                    <p className="-mt-2 text-xs text-muted-foreground">At least 8 characters, with a letter and a number.</p>
                    <div className="space-y-2">
                      <Label htmlFor="su-phone">Mobile number <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      {phoneInput("su-phone", signup.phone, (v) => setSignup({ ...signup, phone: v }), false, false)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="su-phone">Mobile number</Label>
                      {phoneInput("su-phone", signup.phone, (v) => setSignup({ ...signup, phone: v }))}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SecretInput id="su-secret" label="Passcode" value={signup.secret} onChange={(v) => setSignup({ ...signup, secret: v })} method="phone" autoComplete="new-password" />
                      <SecretInput id="su-confirm" label="Confirm passcode" value={signup.confirm} onChange={(v) => setSignup({ ...signup, confirm: v })} method="phone" autoComplete="new-password" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="su-email">Email ID <span className="font-normal text-muted-foreground">(optional)</span></Label>
                      <Input id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} />
                    </div>
                  </>
                )}
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
                {errorBox}
                <Button type="submit" size="lg" className="w-full" disabled={loading || !signupReady}>
                  {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Create account
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{" "}
                  <button type="button" className="cursor-pointer font-semibold text-primary hover:underline" onClick={() => switchMode("signin")}>Sign in</button>
                </p>
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
