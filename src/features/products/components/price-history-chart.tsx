"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, ComposedChart, Legend } from "recharts";
import { ArrowDownRight, ArrowUpRight, LineChart as LineIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import { cn, formatINR } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getRetailer } from "@/features/retailers/retailers";
import type { PriceHistory } from "@/server/pricing/product-service";

const shortDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
const compactINR = (v: number) => (v >= 100000 ? `₹${(v / 100000).toFixed(1)}L` : v >= 1000 ? `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : `₹${v}`);

function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("font-display text-lg font-bold", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</p>
    </div>
  );
}

/** 30/90-day price history with lowest/highest/average stats and per-store lines. */
export function PriceHistoryChart({ productId }: { productId: string }) {
  const [days, setDays] = useState<"30" | "90">("30");
  const [mode, setMode] = useState<"best" | "stores">("best");
  const { data, isLoading } = useQuery({
    queryKey: ["history", productId, days],
    queryFn: () => api<PriceHistory>(`/api/products/${productId}/history?days=${days}`),
  });
  const s = data?.stats;

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2"><LineIcon className="size-5 text-primary" aria-hidden /> Price history</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "best" | "stores")}>
            <TabsList>
              <TabsTrigger value="best">Best price</TabsTrigger>
              <TabsTrigger value="stores">By store</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={days} onValueChange={(v) => setDays(v as "30" | "90")}>
            <TabsList>
              <TabsTrigger value="30">30 days</TabsTrigger>
              <TabsTrigger value="90">90 days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {isLoading || !s ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          ) : (
            <>
              <Stat label={`Lowest (${days}d)`} value={formatINR(s.lowest)} tone="good" />
              <Stat label={`Highest (${days}d)`} value={formatINR(s.highest)} tone="bad" />
              <Stat label="Average" value={formatINR(s.average)} />
              <div className="rounded-2xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">Change</p>
                <p className={cn("flex items-center gap-1 font-display text-lg font-bold", (s.changePercent ?? 0) <= 0 ? "text-success" : "text-destructive")}>
                  {(s.changePercent ?? 0) <= 0 ? <ArrowDownRight className="size-4" aria-hidden /> : <ArrowUpRight className="size-4" aria-hidden />}
                  {s.changePercent !== null ? `${Math.abs(s.changePercent)}%` : "—"}
                </p>
              </div>
            </>
          )}
        </div>
        <div className="h-72 w-full" role="img" aria-label={s ? `Price chart. Lowest ${formatINR(s.lowest)}, highest ${formatINR(s.highest)}, average ${formatINR(s.average)}.` : "Price chart loading"}>
          {isLoading || !data ? (
            <Skeleton className="size-full" />
          ) : data.points.length < 2 ? (
            <div className="grid size-full place-items-center text-sm text-muted-foreground">Not enough history yet – check back soon.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {mode === "best" ? (
                <AreaChart data={data.points} margin={{ left: 4, right: 8, top: 8 }}>
                  <defs>
                    <linearGradient id="pp-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickFormatter={compactINR} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-popover)", color: "var(--color-popover-foreground)" }}
                    labelFormatter={(l) => shortDate(String(l))}
                    formatter={(v) => [formatINR(Number(v)), "Best price"]}
                  />
                  <Area type="monotone" dataKey="best" stroke="var(--color-chart-1)" strokeWidth={2.5} fill="url(#pp-area)" />
                </AreaChart>
              ) : (
                <ComposedChart data={data.points} margin={{ left: 4, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} minTickGap={24} />
                  <YAxis tickFormatter={compactINR} tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} tickLine={false} axisLine={false} width={56} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{ borderRadius: 16, border: "1px solid var(--color-border)", background: "var(--color-popover)", color: "var(--color-popover-foreground)" }}
                    labelFormatter={(l) => shortDate(String(l))}
                    formatter={(v, name) => [formatINR(Number(v)), getRetailer(String(name))?.name ?? String(name)]}
                  />
                  <Legend formatter={(v) => getRetailer(String(v))?.name ?? v} wrapperStyle={{ fontSize: 12 }} />
                  {data.retailers.map((r) => (
                    <Line key={r} type="monotone" dataKey={r} stroke={getRetailer(r)?.color} strokeWidth={2} dot={false} connectNulls />
                  ))}
                </ComposedChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        {s?.lowestOn && <p className="text-xs text-muted-foreground">Lowest price in this period was on {new Date(s.lowestOn).toLocaleDateString("en-IN", { dateStyle: "medium" })}.</p>}
      </CardContent>
    </Card>
  );
}
