import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLogs } from "@/server/admin/analytics";
import { cn } from "@/lib/utils";

const LEVELS = ["ALL", "INFO", "WARN", "ERROR"] as const;
const variant = { DEBUG: "secondary", INFO: "secondary", WARN: "warning", ERROR: "destructive" } as const;

export default async function AdminLogs({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const { level = "ALL" } = await searchParams;
  const logs = await getLogs(level === "ALL" ? undefined : level, 150);
  return (
    <div className="space-y-4">
      <div className="flex gap-2" role="group" aria-label="Filter by level">
        {LEVELS.map((l) => (
          <Link key={l} href={l === "ALL" ? "/admin/logs" : `/admin/logs?level=${l}`} aria-current={level === l ? "true" : undefined} className={cn("rounded-full px-4 py-1.5 text-sm font-medium", level === l ? "bg-foreground text-background" : "glass")}>{l}</Link>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <ul className="divide-y divide-border/60 font-mono text-xs">
            {logs.map((log) => (
              <li key={log.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-4">
                <span className="w-40 shrink-0 text-muted-foreground">{log.createdAt.toISOString().replace("T", " ").slice(0, 19)}Z</span>
                <Badge variant={variant[log.level]} className="w-16 justify-center">{log.level}</Badge>
                <span className="w-20 shrink-0 font-semibold">{log.scope}</span>
                <span className="flex-1 break-all">
                  {log.message}
                  {log.context ? <span className="block text-muted-foreground">{JSON.stringify(log.context).slice(0, 300)}</span> : null}
                </span>
              </li>
            ))}
            {!logs.length && <li className="p-6 text-center text-muted-foreground">No logs.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
