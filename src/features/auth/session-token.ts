import "server-only";
/**
 * Session token helpers (server only).
 *
 * The session cookie is a signed JWT with a *sliding* inactivity window:
 *   exp = lastActivity + SESSION_IDLE_MINUTES.
 * Any user interaction calls /api/auth/activity which re-issues the token, so a session
 * only expires after a full idle window with no interaction.
 */
import { randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { db } from "@/lib/db";

export { SESSION_COOKIE } from "./cookie";

export interface SessionClaims {
  sid: string;
  uid: string;
  role: "USER" | "ADMIN";
  /** Last activity, epoch seconds. */
  act: number;
}

export function idleSeconds(): number {
  const minutes = Number(process.env.SESSION_IDLE_MINUTES || 30);
  return Math.max(60, Math.round(minutes * 60));
}

const SIGNING_KEY = "session_signing_key";
let secretKey: Promise<Uint8Array> | undefined;

/**
 * HMAC key for session tokens: SESSION_SECRET when set, otherwise a random 256-bit key that is
 * generated once and kept in the `app_secrets` table (shared by every instance of the app).
 */
export function secret(): Promise<Uint8Array> {
  secretKey ??= loadSecret().catch((error: unknown) => {
    secretKey = undefined;
    throw error;
  });
  return secretKey;
}

async function loadSecret(): Promise<Uint8Array> {
  const explicit = process.env.SESSION_SECRET?.trim();
  if (explicit) {
    if (explicit.length < 32) throw new Error("SESSION_SECRET must be at least 32 characters");
    return new TextEncoder().encode(explicit);
  }
  await db.appSecret.createMany({ data: [{ name: SIGNING_KEY, value: randomBytes(32).toString("base64") }], skipDuplicates: true });
  const row = await db.appSecret.findUniqueOrThrow({ where: { name: SIGNING_KEY } });
  return new Uint8Array(Buffer.from(row.value, "base64"));
}

export async function signSession(claims: Omit<SessionClaims, "act">, now = Math.floor(Date.now() / 1000)) {
  const token = await new SignJWT({ ...claims, act: now })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + idleSeconds())
    .sign(await secret());
  return token;
}

export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret(), { algorithms: ["HS256"] });
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
