import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signupVerifySchema } from "@/features/auth/schemas";
import { startSession } from "@/features/auth/server/session";
import { createAccount } from "@/server/auth/accounts";
import { verifyOtp } from "@/server/auth/otp";

/** Sign up, step 2: checks the code, creates the profile and signs the new user in. */
export const POST = handler(async (req: Request) => {
  const { channel, token, ...profile } = signupVerifySchema.parse(await req.json());
  const limit = await rateLimit(`otp:verify:${clientIp(req.headers)}`, 20, 600);
  if (!limit.ok) throw new HttpError(429, "Too many attempts. Try again later.", "rate_limited");

  await verifyOtp(channel, channel === "email" ? profile.email : profile.phone, "signup", token);
  const user = await createAccount(profile, channel);
  await startSession(user, channel === "email" ? "EMAIL_OTP" : "PHONE_OTP");
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});
