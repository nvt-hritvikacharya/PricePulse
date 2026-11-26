"use client";
import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSessionStore } from "@/stores/session-store";

const PING_THROTTLE_MS = 30_000;
const WARN_BEFORE_MS = 2 * 60_000;
const EVENTS = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;

/**
 * Enforces the 1-hour inactivity timeout on the client:
 *  - any interaction (throttled to every 30s) slides the server session forward,
 *  - shows a "stay signed in" toast 2 minutes before expiry,
 *  - signs out + redirects to /login when the window lapses.
 */
export function SessionGuard({ initialExpiresAt, idleMs }: { initialExpiresAt: number; idleMs: number }) {
  const { expiresAt, setExpiresAt } = useSessionStore();
  const lastPing = useRef(0);
  const warned = useRef(false);
  const inflight = useRef(false);

  useEffect(() => setExpiresAt(initialExpiresAt), [initialExpiresAt, setExpiresAt]);

  const ping = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    lastPing.current = Date.now();
    try {
      const res = await fetch("/api/auth/activity", { method: "POST" });
      if (res.status === 401) {
        window.location.href = "/login?reason=expired";
        return;
      }
      const data = (await res.json()) as { expiresAt: number };
      setExpiresAt(data.expiresAt);
      warned.current = false;
    } catch {
      /* offline – try again on next interaction */
    } finally {
      inflight.current = false;
    }
  }, [setExpiresAt]);

  useEffect(() => {
    const onActivity = () => {
      if (Date.now() - lastPing.current > PING_THROTTLE_MS) void ping();
    };
    for (const e of EVENTS) window.addEventListener(e, onActivity, { passive: true });
    return () => {
      for (const e of EVENTS) window.removeEventListener(e, onActivity);
    };
  }, [ping]);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = async () => {
      const left = expiresAt - Date.now();
      if (left <= 0) {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        window.location.href = "/login?reason=expired";
      } else if (left <= Math.min(WARN_BEFORE_MS, idleMs / 4) && !warned.current) {
        warned.current = true;
        toast.warning("You'll be signed out soon due to inactivity", {
          duration: left,
          action: { label: "Stay signed in", onClick: () => void ping() },
        });
      }
    };
    const id = window.setInterval(tick, 5_000);
    return () => window.clearInterval(id);
  }, [expiresAt, idleMs, ping]);

  return null;
}
