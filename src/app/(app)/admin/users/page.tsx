import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DonutChart, TrendChart } from "@/features/admin/components/charts";
import { getUserAnalytics } from "@/server/admin/analytics";
import { timeAgo } from "@/lib/utils";

export default async function AdminUsers() {
  const a = await getUserAnalytics();
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Daily active users</CardTitle></CardHeader>
          <CardContent><TrendChart data={a.dau} label="Active users" color="var(--color-chart-3)" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sign-in methods</CardTitle></CardHeader>
          <CardContent>
            <DonutChart data={a.byMethod} label="Users by sign-in method" />
            <ul className="mt-2 flex flex-wrap gap-2 text-xs">{a.byMethod.map((m) => <li key={m.name}><Badge variant="secondary">{m.name.replace("_", " ")}: {m.value}</Badge></li>)}</ul>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Recent users</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b border-border text-left text-xs text-muted-foreground uppercase"><th className="py-2">User</th><th>Method</th><th>Role</th><th>Searches</th><th>Alerts</th><th>Joined</th><th>Last active</th></tr></thead>
            <tbody>
              {a.recent.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="py-2.5"><span className="font-medium">{u.name ?? "—"}</span><span className="block text-xs text-muted-foreground">{u.email ?? u.phone}</span></td>
                  <td>{u.authMethod.replace("_", " ")}</td>
                  <td><Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>{u.role}</Badge></td>
                  <td>{u._count.searchHistory}</td>
                  <td>{u._count.priceAlerts}</td>
                  <td>{timeAgo(u.createdAt)}</td>
                  <td>{u.lastActiveAt ? timeAgo(u.lastActiveAt) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
