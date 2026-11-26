import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { signinSchema } from "@/features/auth/schemas";
import { startSession } from "@/features/auth/server/session";
import { authenticate } from "@/server/auth/accounts";

/** Signs in with email + password or mobile + passcode (30-minute sliding idle window). */
export const POST = handler(async (req: Request) => {
  const body = signinSchema.parse(await req.json());
  const identifier = body.method === "email" ? body.email : body.phone;
  const ipLimit = await rateLimit(`signin:ip:${clientIp(req.headers)}`, 20, 600);
  const idLimit = await rateLimit(`signin:id:${identifier}`, 10, 600);
  if (!ipLimit.ok || !idLimit.ok) throw new HttpError(429, "Too many attempts. Try again in a few minutes.", "rate_limited");

  const user = await authenticate(body.method, identifier, body.secret);
  await startSession(user, body.method === "email" ? "EMAIL_PASSWORD" : "PHONE_PASSCODE");
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});
