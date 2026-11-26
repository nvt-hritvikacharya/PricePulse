import "server-only";
import type { AuthMethod, Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Every login is a row in `sessions`. A session is over when the user signs out (revokedAt)
 * or after SESSION_IDLE_MINUTES without any activity (expiresAt, slid forward on each action).
 */
export type SessionStatus = "active" | "signed_out" | "idle_timeout";

export interface LoginSessionDTO {
  id: string;
  method: AuthMethod | null;
  device: string;
  ip: string | null;
  startedAt: string;
  lastActiveAt: string;
  endedAt: string | null;
  status: SessionStatus;
  durationMinutes: number;
}

type Row = Prisma.SessionGetPayload<object>;

export function describeDevice(ua: string | null): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
}

export function toSessionDTO(s: Row, now = new Date()): LoginSessionDTO {
  const status: SessionStatus = s.revokedAt ? "signed_out" : s.expiresAt <= now ? "idle_timeout" : "active";
  const endedAt = s.revokedAt ?? (status === "idle_timeout" ? s.expiresAt : null);
  const end = status === "active" ? now : status === "signed_out" ? s.revokedAt! : s.lastActiveAt;
  return {
    id: s.id,
    method: s.method,
    device: describeDevice(s.userAgent),
    ip: s.ip,
    startedAt: s.createdAt.toISOString(),
    lastActiveAt: s.lastActiveAt.toISOString(),
    endedAt: endedAt?.toISOString() ?? null,
    status,
    durationMinutes: Math.max(0, Math.round((end.getTime() - s.createdAt.getTime()) / 60_000)),
  };
}

export async function listUserSessions(userId: string, take = 20) {
  const rows = await db.session.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take });
  return rows.map((r) => toSessionDTO(r));
}

export async function listAllSessions(take = 200) {
  const rows = await db.session.findMany({
    orderBy: { createdAt: "desc" },
    take,
    include: { user: { select: { id: true, name: true, email: true, phone: true } } },
  });
  const now = new Date();
  return rows.map((r) => ({ ...toSessionDTO(r, now), user: r.user }));
}
