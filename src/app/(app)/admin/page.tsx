import { AlertTriangle, BellRing, Package, Search, ShoppingBag, UserPlus, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Kpi } from "@/features/admin/components/kpi";
import { TrendChart } from "@/features/admin/components/charts";
import { getOverview } from "@/server/admin/analytics";

export default async function AdminDashboard() {
  const { kpis, searchesByDay, signupsByDay } = await getOverview();
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={Users} label="Total users" value={kpis.users} hint={`${kpis.newUsers} new in 24h`} />
        <Kpi icon={Zap} label="Active (24h)" value={kpis.activeUsers} />
        <Kpi icon={Search} label="Searches (24h)" value={kpis.searches24h} />
        <Kpi icon={Package} label="Products tracked" value={kpis.products} hint={`${kpis.offers} live offers`} />
        <Kpi icon={BellRing} label="Active alerts" value={kpis.alerts} />
        <Kpi icon={ShoppingBag} label="Alerts triggered" value={kpis.triggered} />
        <Kpi icon={UserPlus} label="New users (24h)" value={kpis.newUsers} />
        <Kpi icon={AlertTriangle} label="Errors (24h)" value={kpis.errors} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Searches · last 30 days</CardTitle></CardHeader>
          <CardContent><TrendChart data={searchesByDay} label="Searches" /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Sign-ups · last 30 days</CardTitle></CardHeader>
          <CardContent><TrendChart data={signupsByDay} label="Sign-ups" color="var(--color-chart-2)" /></CardContent>
        </Card>
      </div>
    </div>
  );
}
