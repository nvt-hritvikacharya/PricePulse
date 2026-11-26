import "server-only";
import type { User } from "@prisma/client";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { adminIdentifiers } from "@/lib/env";
import type { SignupProfile } from "@/features/auth/schemas";
import type { OtpChannel } from "./otp";

export const findUserByIdentifier = (channel: OtpChannel, target: string) =>
  channel === "email" ? db.user.findUnique({ where: { email: target } }) : db.user.findUnique({ where: { phone: target } });

/** Sign-up pre-check: neither identifier may belong to an existing account. */
export async function assertIdentifiersFree(email: string, phone: string) {
  const taken = await db.user.findFirst({ where: { OR: [{ email }, { phone }] }, select: { email: true } });
  if (taken) {
    const which = taken.email === email ? "email" : "mobile number";
    throw new HttpError(409, `An account with this ${which} already exists. Sign in instead.`, "account_exists");
  }
}

/** Creates the profile after the code sent to `verified` was confirmed. */
export async function createAccount(profile: SignupProfile, verified: OtpChannel): Promise<User> {
  const now = new Date();
  // Only an identifier the user just proved they own can match ADMIN_EMAILS.
  const isAdmin = adminIdentifiers.has(verified === "email" ? profile.email : profile.phone);
  try {
    return await db.user.create({
      data: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: new Date(`${profile.dateOfBirth}T00:00:00Z`),
        gender: profile.gender,
        authMethod: verified === "email" ? "EMAIL_OTP" : "PHONE_OTP",
        role: isAdmin ? "ADMIN" : "USER",
        emailVerifiedAt: verified === "email" ? now : null,
        phoneVerifiedAt: verified === "phone" ? now : null,
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

/** Marks the identifier verified and records the login on an existing account. */
export async function recordSignIn(user: User, channel: OtpChannel): Promise<User> {
  const now = new Date();
  const identifier = channel === "email" ? user.email : user.phone;
  return db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: now,
      lastActiveAt: now,
      ...(channel === "email" && !user.emailVerifiedAt ? { emailVerifiedAt: now } : {}),
      ...(channel === "phone" && !user.phoneVerifiedAt ? { phoneVerifiedAt: now } : {}),
      ...(identifier && adminIdentifiers.has(identifier.toLowerCase()) ? { role: "ADMIN" as const } : {}),
    },
  });
}
