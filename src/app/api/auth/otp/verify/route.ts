import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyOtpSchema } from "@/features/auth/schemas";
import { startSession } from "@/features/auth/server/session";
import { findUserByIdentifier, recordSignIn } from "@/server/auth/accounts";
import { verifyOtp } from "@/server/auth/otp";

/** Sign in, step 2: checks the code and starts a session (30-minute sliding idle window). */
export const POST = handler(async (req: Request) => {
  const body = verifyOtpSchema.parse(await req.json());
  const limit = await rateLimit(`otp:verify:${clientIp(req.headers)}`, 20, 600);
  if (!limit.ok) throw new HttpError(429, "Too many attempts. Try again later.", "rate_limited");

  const target = body.channel === "email" ? body.email : body.phone;
  await verifyOtp(body.channel, target, "signin", body.token);
  const existing = await findUserByIdentifier(body.channel, target);
  if (!existing) throw new HttpError(404, "No account found. Sign up first.", "account_not_found");

  const user = await recordSignIn(existing, body.channel);
  await startSession(user, body.channel === "email" ? "EMAIL_OTP" : "PHONE_OTP");
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});
