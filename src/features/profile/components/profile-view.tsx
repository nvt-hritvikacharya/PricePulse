"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { Bell, Camera, Clock, Heart, Loader2, LogOut, Monitor, Moon, Save, Search, Sun } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { cn, timeAgo } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ProductMiniCard, type MiniProduct } from "@/features/products/components/product-mini-card";
import { GENDER_LABELS, GENDERS } from "@/features/auth/schemas";
import { enablePush, pushSupported } from "../push";
import { LoginSessionsCard } from "./login-sessions-card";

interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  avatarUrl: string | null;
  role: string;
  theme: string;
  authMethod: string;
  createdAt: string;
  counts: { priceAlerts: number; wishlist: number; favorites: number; recentlyViewed: number; searchHistory: number };
}

interface Prefs {
  emailAlerts: boolean;
  pushAlerts: boolean;
  weeklyDigest: boolean;
  priceDropOnly: boolean;
  minDropPercent: number;
}

/** Downscales an image file to a 256px JPEG data URL (keeps DB rows small). */
async function resizeImage(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const scale = Math.max(size / bitmap.width, size / bitmap.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function Stat({ icon: Icon, label, value, href }: { icon: typeof Bell; label: string; value: number; href: string }) {
  return (
    <Link href={href} className="glass flex items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5">
      <span className="bg-brand-gradient grid size-10 place-items-center rounded-xl text-white"><Icon className="size-5" aria-hidden /></span>
      <span>
        <span className="block font-display text-xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export function ProfileView({ idleMinutes }: { idleMinutes: number }) {
  const qc = useQueryClient();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => api<{ user: Profile }>("/api/profile") });
  const prefsQ = useQuery({ queryKey: ["prefs"], queryFn: () => api<{ preferences: Prefs; capabilities: { email: boolean; push: boolean }; vapidPublicKey: string | null }>("/api/notifications/preferences") });
  const viewed = useQuery({ queryKey: ["recently-viewed"], queryFn: () => api<{ items: { viewedAt: string; product: MiniProduct }[] }>("/api/recently-viewed") });

  const [form, setForm] = useState({ name: "", email: "", phone: "", dateOfBirth: "", gender: "" });
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  useEffect(() => {
    if (profile.data) {
      const p = profile.data.user;
      setForm({ name: p.name ?? "", email: p.email ?? "", phone: p.phone?.replace(/^\+91/, "") ?? "", dateOfBirth: p.dateOfBirth?.slice(0, 10) ?? "", gender: p.gender ?? "" });
    }
  }, [profile.data]);
  useEffect(() => {
    if (prefsQ.data) setPrefs(prefsQ.data.preferences);
  }, [prefsQ.data]);

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api("/api/profile", { method: "PATCH", json: data }),
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile"] });
      router.refresh();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't save profile"),
  });
  const savePrefs = useMutation({
    mutationFn: (p: Prefs) => api("/api/notifications/preferences", { method: "PUT", json: p }),
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: () => toast.error("Couldn't save preferences"),
  });

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image");
    save.mutate({ avatarUrl: await resizeImage(file) });
  }

  function changeTheme(t: "light" | "dark" | "system") {
    setTheme(t);
    api("/api/profile", { method: "PATCH", json: { theme: t } }).catch(() => undefined);
  }

  async function onEnablePush() {
    const res = await enablePush(prefsQ.data?.vapidPublicKey).catch(() => "unsupported" as const);
    const msg = { enabled: "Push notifications enabled on this device", denied: "Permission denied in the browser", unsupported: "This browser doesn't support web push", unconfigured: "Web push isn't configured on the server (VAPID keys missing)" }[res];
    if (res === "enabled") toast.success(msg);
    else toast.error(msg);
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    qc.clear();
    router.replace("/login");
    router.refresh();
  }

  const u = profile.data?.user;
  if (profile.isLoading || !u) return <div className="space-y-4"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>;
  const initials = (u.name ?? u.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      <section className="glass flex flex-col items-start gap-6 rounded-3xl p-6 sm:flex-row sm:items-center">
        <div className="relative">
          <Avatar className="size-24 ring-4 ring-primary/20">
            {u.avatarUrl && <AvatarImage src={u.avatarUrl} alt="Profile photo" />}
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <button onClick={() => fileRef.current?.click()} className="bg-brand-gradient absolute right-0 bottom-0 grid size-9 cursor-pointer place-items-center rounded-full text-white shadow-lg" aria-label="Change profile photo">
            <Camera className="size-4" />
          </button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onPhoto} />
        </div>
        <div className="flex-1">
          <h1 className="font-display text-3xl font-bold tracking-tight">{u.name ?? "Shopper"}</h1>
          <p className="text-muted-foreground">{u.email ?? u.phone}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">Member since {new Date(u.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</Badge>
            <Badge variant="outline">{u.authMethod.replace("_", " ").toLowerCase()}</Badge>
            {u.role === "ADMIN" && <Badge>Admin</Badge>}
          </div>
        </div>
        <Button variant="outline" onClick={logout}><LogOut /> Log out</Button>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Your activity">
        <Stat icon={Bell} label="Price alerts" value={u.counts.priceAlerts} href="/alerts" />
        <Stat icon={Heart} label="Wishlist" value={u.counts.wishlist} href="/wishlist" />
        <Stat icon={Clock} label="Recently viewed" value={u.counts.recentlyViewed} href="#viewed" />
        <Stat icon={Search} label="Searches" value={u.counts.searchHistory} href="/home" />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
            <CardDescription>Used for alerts and account recovery.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate({ name: form.name, email: form.email, phone: form.phone, dateOfBirth: form.dateOfBirth, gender: form.gender }); }}>
              <div className="space-y-2">
                <Label htmlFor="p-name">Full name</Label>
                <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-email">Email</Label>
                <Input id="p-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-phone">Mobile (+91)</Label>
                <Input id="p-phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} autoComplete="tel-national" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="p-dob">Date of birth</Label>
                  <Input id="p-dob" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} autoComplete="bday" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="p-gender">Gender</Label>
                  <select id="p-gender" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 text-sm shadow-xs outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40">
                    <option value="">Not set</option>
                    {GENDERS.map((g) => <option key={g} value={g}>{GENDER_LABELS[g]}</option>)}
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={save.isPending}>{save.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Save />} Save changes</Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6" id="settings">
          <Card>
            <CardHeader><CardTitle>Appearance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Theme">
                {([["light", Sun, "Light"], ["dark", Moon, "Dark"], ["system", Monitor, "System"]] as const).map(([value, Icon, label]) => (
                  <button key={value} role="radio" aria-checked={theme === value} onClick={() => changeTheme(value)} className={cn("flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border p-3 text-sm font-medium transition", theme === value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}>
                    <Icon className="size-5" aria-hidden /> {label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification preferences</CardTitle>
              {prefsQ.data && (
                <CardDescription>
                  Email {prefsQ.data.capabilities.email ? "delivery active" : "not configured (logged to inbox)"} · Push {prefsQ.data.capabilities.push ? "available" : "not configured"}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {!prefs ? <Skeleton className="h-40" /> : (
                <>
                  {([["emailAlerts", "Email alerts"], ["pushAlerts", "Push notifications"], ["weeklyDigest", "Weekly deals digest"], ["priceDropOnly", "Only notify on price drops"]] as const).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between rounded-2xl bg-muted/60 p-3">
                      <Label htmlFor={`pref-${key}`}>{label}</Label>
                      <Switch id={`pref-${key}`} checked={prefs[key]} onCheckedChange={(v) => setPrefs({ ...prefs, [key]: v })} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted/60 p-3">
                    <Label htmlFor="pref-min">Minimum drop to notify (%)</Label>
                    <Input id="pref-min" type="number" min={1} max={90} value={prefs.minDropPercent} onChange={(e) => setPrefs({ ...prefs, minDropPercent: Number(e.target.value) })} className="h-9 w-20" />
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button onClick={() => savePrefs.mutate(prefs)} disabled={savePrefs.isPending}><Save /> Save preferences</Button>
                    {pushSupported() && <Button variant="outline" onClick={onEnablePush}><Bell /> Enable push on this device</Button>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <LoginSessionsCard idleMinutes={idleMinutes} />

      <section id="viewed" aria-labelledby="viewed-h" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="viewed-h" className="font-display text-xl font-bold">Recently viewed</h2>
          {Boolean(viewed.data?.items.length) && (
            <Button variant="ghost" size="sm" onClick={async () => { await api("/api/recently-viewed", { method: "DELETE" }); viewed.refetch(); qc.invalidateQueries({ queryKey: ["profile"] }); }}>Clear</Button>
          )}
        </div>
        {viewed.data?.items.length === 0 && <p className="text-sm text-muted-foreground">Products you open will appear here.</p>}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {viewed.data?.items.map(({ product, viewedAt }, i) => (
            <div key={product.id} className="space-y-1">
              <ProductMiniCard product={product} index={i} />
              <p className="px-1 text-[11px] text-muted-foreground">Viewed {timeAgo(viewedAt)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
