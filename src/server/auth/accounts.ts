import "server-only";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { hashSecret, verifySecret } from "@/lib/passwords";
import type { SignupInput } from "@/features/auth/schemas";

/**
 * Email + password / mobile + passcode accounts. Nothing here proves who owns an email or phone
 * number, so no identifier ever grants a role: ADMIN is set only with `npm run admin:grant`.
 */
export type SigninMethod = "email" | "phone";

const MAX_FAILURES = 5;
const LOCK_MS = 15 * 60_000;

export const credentialKind = (user: Pick<User, "authMethod">) => (user.authMethod === "PHONE_PASSCODE" ? "passcode" : "password");

export async function createAccount(input: SignupInput): Promise<User> {
  const taken = await db.user.findFirst({
    where: { OR: [...(input.email ? [{ email: input.email }] : []), ...(input.phone ? [{ phone: input.phone }] : [])] },
    select: { email: true },
  });
  if (taken) {
    const which = input.email && taken.email === input.email ? "email" : "mobile number";
    throw new HttpError(409, `An account with this ${which} already exists. Sign in instead.`, "account_exists");
  }
  const now = new Date();
  try {
    return await db.user.create({
      data: {
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00Z`),
        gender: input.gender,
        authMethod: input.method === "email" ? "EMAIL_PASSWORD" : "PHONE_PASSCODE",
        passwordHash: await hashSecret(input.secret),
        lastLoginAt: now,
        lastActiveAt: now,
        notificationPreference: { create: {} },
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") {
      throw new HttpError(409, "An account with this email or mobile number already exists. Sign in instead.", "account_exists");
    }
    throw err;
  }
}

/** Checks the password/passcode; 5 wrong tries lock the account for 15 minutes. */
export async function authenticate(method: SigninMethod, identifier: string, secret: string): Promise<User> {
  const user = method === "email" ? await db.user.findUnique({ where: { email: identifier } }) : await db.user.findUnique({ where: { phone: identifier } });
  const wrong = new HttpError(401, method === "email" ? "Incorrect email or password." : "Incorrect mobile number or passcode.", "invalid_credentials");

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new HttpError(429, "Too many wrong attempts. Try again in 15 minutes.", "account_locked");
  }
  const ok = await verifySecret(secret, user?.passwordHash);
  if (!user || !ok) {
    if (user) {
      const failures = user.failedLoginCount + 1;
      await db.user.update({
        where: { id: user.id },
        data: failures >= MAX_FAILURES ? { failedLoginCount: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLoginCount: failures },
      });
    }
    throw wrong;
  }
  const now = new Date();
  return db.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now, lastActiveAt: now } });
}

/** Re-authentication for sensitive changes (identifier or secret). */
export async function assertCurrentSecret(userId: string, secret: string | undefined) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { passwordHash: true, authMethod: true } });
  if (!user.passwordHash) throw new HttpError(400, "This account has no password yet.", "no_password");
  if (!secret || !(await verifySecret(secret, user.passwordHash))) {
    throw new HttpError(403, `Your current ${credentialKind(user)} is incorrect.`, "invalid_credentials");
  }
}
