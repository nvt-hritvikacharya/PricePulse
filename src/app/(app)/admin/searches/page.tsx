import { Clock, Gauge, Hash, ListOrdered } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HBarChart, TrendChart } from "@/features/admin/components/charts";
import { Kpi } from "@/features/admin/components/kpi";
import { getSearchAnalytics } from "@/server/admin/analytics";
import { timeAgo } from "@/lib/utils";

export default async function AdminSearches() {
  const s = await getSearchAnalytics();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Hash} label="Searches (7d)" value={s.total7d} />
        <Kpi icon={Gauge} label="Avg latency (7d)" value={`${s.avgLatencyMs} ms`} />
        <Kpi icon={ListOrdered} label="Avg results" value={s.avgResults} />
        <Kpi icon={Clock} label="Zero-result queries" value={s.zero.length} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top queries (30d)</CardTitle></CardHeader>
          <CardContent>{s.top.length ? <HBarChart data={s.top.map((t) => ({ name: t.query, value: t.count }))} label="Top search queries" /> : <p className="text-sm text-muted-foreground">No searches yet.</p>}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Search volume (30d)</CardTitle></CardHeader>
          <CardContent><TrendChart data={s.byDay} label="Searches" /></CardContent>
        </Card>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Recent searches</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y divide-border/60 text-sm">
              {s.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-medium">{r.query}</span>
                  <span className="text-xs text-muted-foreground">{r.user?.name ?? r.user?.email ?? "anon"} · {r.resultCount} results · {r.durationMs ?? "?"} ms · {timeAgo(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Zero-result queries</CardTitle></CardHeader>
          <CardContent>
            {s.zero.length ? <ul className="space-y-1 text-sm">{s.zero.map((z) => <li key={z.query} className="flex justify-between"><span>{z.query}</span><span className="text-muted-foreground">{z.count}×</span></li>)}</ul> : <p className="text-sm text-muted-foreground">Every query returned results 🎉</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
