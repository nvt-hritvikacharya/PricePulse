/**
 * Edge-safe session token helpers (used by middleware AND node route handlers).
 *
 * The session cookie is a signed JWT with a *sliding* inactivity window:
 *   exp = lastActivity + SESSION_IDLE_MINUTES.
 * Any user interaction calls /api/auth/activity which re-issues the token, so a session
 * only expires after a full idle window with no interaction.
 */
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "pp_session";

export interface SessionClaims {
  sid: string;
  uid: string;
  role: "USER" | "ADMIN";
  /** Last activity, epoch seconds. */
  act: number;
}

export function idleSeconds(): number {
  const minutes = Number(process.env.SESSION_IDLE_MINUTES || 60);
  return Math.max(60, Math.round(minutes * 60));
}

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET || "dev-insecure-session-secret-change-me-please-0000";
  return new TextEncoder().encode(s);
}

export async function signSession(claims: Omit<SessionClaims, "act">, now = Math.floor(Date.now() / 1000)) {
  const token = await new SignJWT({ ...claims, act: now })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + idleSeconds())
    .sign(secret());
  return token;
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string" || typeof payload.uid !== "string") return null;
    return payload as unknown as SessionClaims;
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_APP_URL?.startsWith("http://"),
    path: "/",
    maxAge: idleSeconds(),
  };
}
