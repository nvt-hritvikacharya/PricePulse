import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listAllSessions, type SessionStatus } from "@/server/auth/sessions";
import { idleSeconds } from "@/features/auth/session-token";
import { formatDateTimeIST } from "@/lib/utils";

export const metadata = { title: "Login sessions" };

const STATUS: Record<SessionStatus, { label: string; variant: "success" | "secondary" | "warning" }> = {
  active: { label: "Active", variant: "success" },
  signed_out: { label: "Signed out", variant: "secondary" },
  idle_timeout: { label: "Idle timeout", variant: "warning" },
};

export default async function AdminSessions() {
  const sessions = await listAllSessions(200);
  const active = sessions.filter((s) => s.status === "active").length;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Login sessions</CardTitle>
        <p className="text-sm text-muted-foreground">
          Every sign-in is recorded. A session ends on logout or after {Math.round(idleSeconds() / 60)} minutes without activity. {active} active now · latest {sessions.length} shown.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <th className="py-2">User</th><th>Method</th><th>Device</th><th>IP</th><th>Started</th><th>Last activity</th><th>Ended</th><th>Duration</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-border/60 last:border-0">
                <td className="py-2.5"><span className="font-medium">{s.user.name ?? "—"}</span><span className="block text-xs text-muted-foreground">{s.user.email ?? s.user.phone}</span></td>
                <td>{s.method?.replace("_", " ") ?? "—"}</td>
                <td>{s.device}</td>
                <td className="font-mono text-xs">{s.ip ?? "—"}</td>
                <td>{formatDateTimeIST(s.startedAt)}</td>
                <td>{formatDateTimeIST(s.lastActiveAt)}</td>
                <td>{s.endedAt ? formatDateTimeIST(s.endedAt) : "—"}</td>
                <td>{s.durationMinutes} min</td>
                <td><Badge variant={STATUS[s.status].variant}>{STATUS[s.status].label}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
