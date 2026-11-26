"use client";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BellOff, BellRing, CheckCircle2, Inbox, Mail, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn, formatINR, timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ProductImage } from "@/components/shared/product-image";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { getRetailer } from "@/features/retailers/retailers";

interface AlertItem {
  id: string;
  targetPrice: number;
  retailer: string | null;
  notifyEmail: boolean;
  notifyPush: boolean;
  active: boolean;
  lastNotifiedAt: string | null;
  triggeredPrice: number | null;
  createdAt: string;
  product: { id: string; slug: string; name: string; imageUrl: string | null; bestPrice: number | null; retailer: string | null };
}

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  url: string | null;
  channels: string[];
  createdAt: string;
}

export function AlertsView() {
  const qc = useQueryClient();
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: () => api<{ alerts: AlertItem[] }>("/api/alerts") });
  const inbox = useQuery({ queryKey: ["notifications"], queryFn: () => api<{ items: NotificationItem[]; unread: number }>("/api/notifications") });

  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => api(`/api/alerts/${id}`, { method: "PATCH", json: { active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/alerts/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Alert deleted");
      qc.invalidateQueries({ queryKey: ["alerts"] });
    },
  });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section aria-labelledby="alerts-h" className="space-y-4">
        <div>
          <h1 id="alerts-h" className="font-display text-3xl font-bold tracking-tight">Price alerts</h1>
          <p className="text-muted-foreground">We check prices regularly and notify you by email and push when they hit your target.</p>
        </div>
        {alerts.isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-3xl" />)}
        {alerts.data?.alerts.length === 0 && (
          <div className="glass rounded-3xl p-10 text-center">
            <BellRing className="mx-auto size-10 text-primary" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold">No alerts yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">Open any product and tap “Price alert” to start tracking.</p>
            <Button asChild className="mt-4"><Link href="/home">Find a product</Link></Button>
          </div>
        )}
        <AnimatePresence>
          {alerts.data?.alerts.map((a) => {
            const hit = a.product.bestPrice !== null && a.product.bestPrice <= a.targetPrice;
            const gap = a.product.bestPrice !== null ? a.product.bestPrice - a.targetPrice : null;
            return (
              <motion.article key={a.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={cn("glass flex flex-col gap-4 rounded-3xl p-4 sm:flex-row sm:items-center", !a.active && "opacity-60")}>
                <Link href={`/product/${a.product.slug}`} className="flex min-w-0 flex-1 items-center gap-4">
                  <ProductImage src={a.product.imageUrl} alt="" className="size-20 shrink-0" sizes="80px" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-semibold hover:text-primary">{a.product.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                      <span>Target <b>{formatINR(a.targetPrice)}</b></span>
                      <span className="text-muted-foreground">·</span>
                      <span>Now <b>{formatINR(a.product.bestPrice)}</b></span>
                      {a.product.retailer && <RetailerLogo retailer={a.product.retailer} size="sm" />}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {hit ? <Badge variant="success"><CheckCircle2 aria-hidden /> Target reached</Badge> : gap !== null && <Badge variant="secondary">{formatINR(gap)} to go</Badge>}
                      {a.retailer && <Badge variant="outline">Only {getRetailer(a.retailer)?.name}</Badge>}
                      {a.notifyEmail && <Badge variant="outline"><Mail aria-hidden /> Email</Badge>}
                      {a.notifyPush && <Badge variant="outline"><Smartphone aria-hidden /> Push</Badge>}
                      {a.lastNotifiedAt && <span className="text-xs text-muted-foreground">Notified {timeAgo(a.lastNotifiedAt)}</span>}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <Switch checked={a.active} onCheckedChange={(active) => toggle.mutate({ id: a.id, active })} aria-label={a.active ? "Pause alert" : "Resume alert"} />
                  <Button variant="ghost" size="icon" aria-label="Delete alert" onClick={() => remove.mutate(a.id)}><Trash2 /></Button>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </section>

      <aside>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Inbox className="size-5 text-primary" aria-hidden /> Notification inbox</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {inbox.isLoading && <Skeleton className="h-20" />}
            {inbox.data?.items.length === 0 && <p className="flex items-center gap-2 text-sm text-muted-foreground"><BellOff className="size-4" aria-hidden /> Nothing yet.</p>}
            {inbox.data?.items.map((n) => (
              <Link key={n.id} href={n.url ?? "#"} className="block rounded-2xl bg-muted/60 p-3 transition hover:bg-muted">
                <p className="line-clamp-1 text-sm font-semibold">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{timeAgo(n.createdAt)} · via {n.channels.map((c) => c.replace("_", " ")).join(", ")}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
