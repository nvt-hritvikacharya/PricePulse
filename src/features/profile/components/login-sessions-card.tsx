"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { formatDateTimeIST } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface LoginSession {
  id: string;
  method: string | null;
  device: string;
  ip: string | null;
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
  status: "active" | "signed_out" | "idle_timeout";
  durationMinutes: number;
}

const STATUS = {
  active: { label: "Active", variant: "success" },
  signed_out: { label: "Signed out", variant: "secondary" },
  idle_timeout: { label: "Ended (idle)", variant: "warning" },
} as const;

/** The user's login history: every sign-in, its device, and how/when it ended. */
export function LoginSessionsCard({ idleMinutes }: { idleMinutes: number }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sessions"], queryFn: () => api<{ currentSessionId: string; sessions: LoginSession[] }>("/api/auth/sessions") });
  const revoke = useMutation({
    mutationFn: (id: string) => api(`/api/auth/sessions/${encodeURIComponent(id)}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Session signed out");
      qc.invalidateQueries({ queryKey: ["sessions"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Couldn't sign out that session"),
  });

  return (
    <Card id="sessions">
      <CardHeader>
        <CardTitle>Login sessions</CardTitle>
        <CardDescription>Every sign-in is recorded. A session ends when you log out or after {idleMinutes} minutes without activity.</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading || !q.data ? (
          <Skeleton className="h-32 rounded-2xl" />
        ) : (
          <ul className="divide-y divide-border">
            {q.data.sessions.map((s) => {
              const current = s.id === q.data.currentSessionId;
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <MonitorSmartphone className="size-5 text-muted-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.device} {current && <span className="text-xs text-primary">(this device)</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.method ? `${s.method.replace("_", " ").toLowerCase()} · ` : ""}
                      Signed in {formatDateTimeIST(s.startedAt)}
                      {s.endedAt ? ` · ended ${formatDateTimeIST(s.endedAt)}` : ` · last active ${formatDateTimeIST(s.lastActiveAt)}`} · {s.durationMinutes} min
                    </p>
                  </div>
                  <Badge variant={STATUS[s.status].variant}>{STATUS[s.status].label}</Badge>
                  {s.status === "active" && !current && (
                    <Button size="sm" variant="outline" onClick={() => revoke.mutate(s.id)} disabled={revoke.isPending}>
                      {revoke.isPending ? <Loader2 className="animate-spin" aria-hidden /> : null} Sign out
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
