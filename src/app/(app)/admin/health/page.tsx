import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProviderHealthPanel } from "@/features/admin/components/provider-health-panel";
import { getProviderCallStats } from "@/server/admin/analytics";
import { timeAgo } from "@/lib/utils";

export default async function AdminHealth() {
  const { recent } = await getProviderCallStats();
  return (
    <div className="space-y-6">
      <ProviderHealthPanel />
      <Card>
        <CardHeader><CardTitle>Recent provider calls</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground uppercase"><th className="py-2">Provider</th><th>Status</th><th>Latency</th><th>Error</th><th>When</th></tr></thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2 font-medium">{c.providerId}</td>
                  <td><Badge variant={c.ok ? "success" : "destructive"}>{c.ok ? "OK" : c.statusCode ?? "ERR"}</Badge></td>
                  <td>{c.latencyMs} ms</td>
                  <td className="max-w-xs truncate text-xs text-muted-foreground">{c.error ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recent.length && <p className="py-4 text-sm text-muted-foreground">No calls recorded yet – run a search.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
