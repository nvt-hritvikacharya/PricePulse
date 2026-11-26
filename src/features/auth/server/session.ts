import "server-only";
import { cookies, headers } from "next/headers";
import type { AuthMethod, User } from "@prisma/client";
import { db } from "@/lib/db";
import { adminIdentifiers } from "@/lib/env";
import { HttpError } from "@/lib/api";
import { logger } from "@/lib/logger";
import { SESSION_COOKIE, idleSeconds, sessionCookieOptions, signSession, verifySession } from "../session-token";

export interface CurrentUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  avatarUrl: string | null;
  role: "USER" | "ADMIN";
  theme: string;
  sessionId: string;
  /** Epoch ms at which the session expires if no further activity happens. */
  expiresAt: number;
}

export interface IdentityInput {
  email?: string | null;
  phone?: string | null;
  supabaseId?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
  method: AuthMethod;
}

/** Finds or creates the local user row for an authenticated identity. */
export async function upsertUser(identity: IdentityInput): Promise<User> {
  const email = identity.email?.toLowerCase() || null;
  const phone = identity.phone || null;
  const isAdmin = (email && adminIdentifiers.has(email)) || (phone && adminIdentifiers.has(phone));

  const existing = await db.user.findFirst({
    where: {
      OR: [
        ...(identity.supabaseId ? [{ supabaseId: identity.supabaseId }] : []),
        ...(email ? [{ email }] : []),
        ...(phone ? [{ phone }] : []),
      ],
    },
  });

  if (existing) {
    return db.user.update({
      where: { id: existing.id },
      data: {
        supabaseId: existing.supabaseId ?? identity.supabaseId ?? undefined,
        email: existing.email ?? email,
        phone: existing.phone ?? phone,
        name: existing.name ?? identity.name ?? undefined,
        avatarUrl: existing.avatarUrl ?? identity.avatarUrl ?? undefined,
        role: isAdmin ? "ADMIN" : existing.role,
        lastLoginAt: new Date(),
        lastActiveAt: new Date(),
      },
    });
  }

  return db.user.create({
    data: {
      supabaseId: identity.supabaseId ?? undefined,
      email,
      phone,
      name: identity.name ?? (email ? email.split("@")[0] : null),
      avatarUrl: identity.avatarUrl ?? undefined,
      authMethod: identity.method,
      role: isAdmin ? "ADMIN" : "USER",
      lastLoginAt: new Date(),
      lastActiveAt: new Date(),
      notificationPreference: { create: {} },
    },
  });
}

/** Creates a DB session row and sets the signed cookie. */
export async function startSession(user: User) {
  const h = await headers();
  const session = await db.session.create({
    data: {
      userId: user.id,
      expiresAt: new Date(Date.now() + idleSeconds() * 1000),
      userAgent: h.get("user-agent")?.slice(0, 300),
      ip: h.get("x-forwarded-for")?.split(",")[0] ?? null,
    },
  });
  const token = await signSession({ sid: session.id, uid: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  logger.info("auth", "Session started", { userId: user.id, method: user.authMethod });
  return session;
}

/**
 * Resolves the current user from the session cookie, validating the DB session
 * (revocation + idle expiry). Returns null when unauthenticated.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await verifySession(token);
  if (!claims) return null;
  const session = await db.session.findUnique({ where: { id: claims.sid }, include: { user: true } });
  if (!session || session.revokedAt || session.expiresAt < new Date()) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    phone: u.phone,
    name: u.name,
    avatarUrl: u.avatarUrl,
    role: u.role,
    theme: u.theme,
    sessionId: session.id,
    expiresAt: (claims.act + idleSeconds()) * 1000,
  };
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "Your session has expired. Please sign in again.", "unauthenticated");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "Admin access required", "forbidden");
  return user;
}

/** Slides the inactivity window forward: re-signs cookie + bumps DB session. */
export async function touchSession(user: CurrentUser): Promise<number> {
  const expiresAt = new Date(Date.now() + idleSeconds() * 1000);
  await db.$transaction([
    db.session.update({ where: { id: user.sessionId }, data: { lastActiveAt: new Date(), expiresAt } }),
    db.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } }),
  ]);
  const token = await signSession({ sid: user.sessionId, uid: user.id, role: user.role });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return expiresAt.getTime();
}

export async function endSession() {
  const jar = await cookies();
  const claims = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (claims) {
    await db.session.updateMany({ where: { id: claims.sid }, data: { revokedAt: new Date() } });
    logger.info("auth", "Session ended", { userId: claims.uid });
  }
  jar.delete(SESSION_COOKIE);
}
