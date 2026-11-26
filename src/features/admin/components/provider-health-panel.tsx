"use client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDashed, KeyRound, RefreshCw, XCircle, AlertTriangle, Database } from "lucide-react";
import { api } from "@/lib/api-client";
import { timeAgo } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import type { ProviderHealth } from "@/server/providers/resilient";

interface ProviderRow {
  id: string;
  name: string;
  kind: string;
  retailers: string[];
  configured: boolean;
  active: boolean;
  requiredEnv: string[];
  rateLimitPerMinute: number;
  health: ProviderHealth;
}

const STATUS = {
  healthy: { icon: CheckCircle2, variant: "success" as const, label: "Healthy" },
  degraded: { icon: AlertTriangle, variant: "warning" as const, label: "Degraded" },
  down: { icon: XCircle, variant: "destructive" as const, label: "Circuit open" },
  idle: { icon: CircleDashed, variant: "secondary" as const, label: "No traffic" },
};

/** Live provider health (auto-refreshes every 15s). */
export function ProviderHealthPanel() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-health"],
    queryFn: () => api<{ providers: ProviderRow[]; cacheBackend: string; demoMode: boolean }>("/api/admin/health"),
    refetchInterval: 15_000,
  });
  if (isLoading || !data) return <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}</div>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary"><Database aria-hidden /> Cache: {data.cacheBackend}</Badge>
        {data.demoMode && <Badge variant="warning">Demo mode – no real provider keys configured</Badge>}
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => refetch()}><RefreshCw className={isFetching ? "animate-spin" : ""} /> Refresh</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {data.providers.map((p) => {
          const st = p.active ? STATUS[p.health.status] : null;
          const Icon = st?.icon ?? KeyRound;
          const successRate = p.health.calls ? Math.round(((p.health.calls - p.health.failures) / p.health.calls) * 100) : null;
          return (
            <article key={p.id} className="glass space-y-3 rounded-3xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display font-bold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">{p.kind} · {p.rateLimitPerMinute}/min quota</p>
                </div>
                {st ? <Badge variant={st.variant}><Icon aria-hidden /> {st.label}</Badge> : <Badge variant="outline"><KeyRound aria-hidden /> {p.configured ? "Inactive" : "Needs keys"}</Badge>}
              </div>
              <div className="flex flex-wrap gap-1">{p.retailers.map((r) => <RetailerLogo key={r} retailer={r} size="sm" />)}</div>
              {p.active ? (
                <dl className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-muted/60 p-2"><dt className="text-muted-foreground">Calls</dt><dd className="font-display text-base font-bold">{p.health.calls}</dd></div>
                  <div className="rounded-xl bg-muted/60 p-2"><dt className="text-muted-foreground">Success</dt><dd className="font-display text-base font-bold">{successRate !== null ? `${successRate}%` : "—"}</dd></div>
                  <div className="rounded-xl bg-muted/60 p-2"><dt className="text-muted-foreground">Avg latency</dt><dd className="font-display text-base font-bold">{p.health.avgLatencyMs ? `${p.health.avgLatencyMs}ms` : "—"}</dd></div>
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">Set {p.requiredEnv.map((e) => <code key={e} className="mx-0.5 rounded bg-muted px-1 py-0.5">{e}</code>)} to enable.</p>
              )}
              {p.health.lastError && <p className="truncate text-xs text-destructive" title={p.health.lastError}>Last error: {p.health.lastError}</p>}
              {p.health.lastSuccessAt && <p className="text-xs text-muted-foreground">Last success {timeAgo(new Date(p.health.lastSuccessAt))}</p>}
            </article>
          );
        })}
      </div>
    </div>
  );
}
