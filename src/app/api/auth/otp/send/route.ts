import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { sendOtpSchema } from "@/features/auth/schemas";
import { findUserByIdentifier } from "@/server/auth/accounts";
import { sendOtp } from "@/server/auth/otp";

/** Sign in, step 1: emails / texts a one-time code to an existing account's email or mobile. */
export const POST = handler(async (req: Request) => {
  const body = sendOtpSchema.parse(await req.json());
  const target = body.channel === "email" ? body.email : body.phone;

  const ipLimit = await rateLimit(`otp:ip:${clientIp(req.headers)}`, 10, 600);
  const targetLimit = await rateLimit(`otp:target:${target}`, 3, 60);
  if (!ipLimit.ok || !targetLimit.ok) {
    throw new HttpError(429, "Too many code requests. Please wait a minute and try again.", "rate_limited");
  }

  if (!(await findUserByIdentifier(body.channel, target))) {
    throw new HttpError(404, `No account uses this ${body.channel === "email" ? "email" : "mobile number"}. Sign up first.`, "account_not_found");
  }
  await sendOtp(body.channel, target, "signin");
  return json({ ok: true });
});
