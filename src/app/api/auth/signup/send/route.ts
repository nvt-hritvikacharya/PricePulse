import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signupSendSchema } from "@/features/auth/schemas";
import { assertIdentifiersFree } from "@/server/auth/accounts";
import { sendOtp } from "@/server/auth/otp";

/** Sign up, step 1: checks the email and mobile are free, then sends a code to the chosen one. */
export const POST = handler(async (req: Request) => {
  const body = signupSendSchema.parse(await req.json());
  const target = body.channel === "email" ? body.email : body.phone;

  const ipLimit = await rateLimit(`otp:ip:${clientIp(req.headers)}`, 10, 600);
  const targetLimit = await rateLimit(`otp:target:${target}`, 3, 60);
  if (!ipLimit.ok || !targetLimit.ok) {
    throw new HttpError(429, "Too many code requests. Please wait a minute and try again.", "rate_limited");
  }

  await assertIdentifiersFree(body.email, body.phone);
  await sendOtp(body.channel, target, "signup");
  return json({ ok: true });
});
