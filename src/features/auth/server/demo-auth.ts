import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";

/**
 * Guards for the public demo (dev OTP enabled in production, so the code is public).
 * Without these, anyone could sign in as the seeded admin or as another visitor's email.
 */
const DEVICE_COOKIE = "pp_demo_device";
export const SHARED_DEMO_EMAIL = "demo@pricepulse.dev";

async function deviceHash(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(DEVICE_COOKIE)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) {
    id = randomBytes(32).toString("hex");
    jar.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }
  return createHash("sha256").update(id).digest("hex");
}

/**
 * Throws when a demo-code login must be refused. Returns the browser binding to store on a
 * newly created account (null for the shared sample account).
 */
export async function authorizeDemoLogin(identity: { email: string | null; phone: string | null }): Promise<string | null> {
  const email = identity.email?.toLowerCase() || null;
  const existing = await db.user.findFirst({
    where: { OR: [...(email ? [{ email }] : []), ...(identity.phone ? [{ phone: identity.phone }] : [])] },
  });
  const hash = await deviceHash();
  if (!existing) return hash;
  if (existing.role === "ADMIN") {
    throw new HttpError(403, "Admin accounts can't sign in with the demo code. Use another email.", "demo_admin_blocked");
  }
  if (existing.email === SHARED_DEMO_EMAIL) return null;
  if (existing.authMethod !== "DEV") {
    throw new HttpError(403, "This account needs a real sign-in, not the demo code.", "demo_account_blocked");
  }
  if (existing.demoDeviceHash !== hash) {
    throw new HttpError(403, "This demo email is already used from another browser. Try a different email.", "demo_account_taken");
  }
  return hash;
}
