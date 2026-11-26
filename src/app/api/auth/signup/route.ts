import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signupSchema } from "@/features/auth/schemas";
import { startSession } from "@/features/auth/server/session";
import { createAccount } from "@/server/auth/accounts";

/** Creates an account (email + password or mobile + passcode) and signs the user in. */
export const POST = handler(async (req: Request) => {
  const limit = await rateLimit(`signup:ip:${clientIp(req.headers)}`, 10, 3600);
  if (!limit.ok) throw new HttpError(429, "Too many sign-ups from this network. Try again later.", "rate_limited");
  const input = signupSchema.parse(await req.json());
  const user = await createAccount(input);
  await startSession(user, user.authMethod);
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});
