import { handler, HttpError, json } from "@/lib/api";
import { isDevAuthEnabled, isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { sendOtpSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/features/auth/server/supabase";

/** Sends a one-time password via Supabase (email or SMS). In dev mode no message is sent. */
export const POST = handler(async (req: Request) => {
  const body = sendOtpSchema.parse(await req.json());
  const target = body.channel === "email" ? body.email : body.phone;

  const ipLimit = await rateLimit(`otp:ip:${clientIp(req.headers)}`, 10, 600);
  const targetLimit = await rateLimit(`otp:target:${target}`, 3, 60);
  if (!ipLimit.ok || !targetLimit.ok) {
    throw new HttpError(429, "Too many code requests. Please wait a minute and try again.", "rate_limited");
  }

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { error } =
      body.channel === "email"
        ? await supabase.auth.signInWithOtp({ email: body.email, options: { shouldCreateUser: true } })
        : await supabase.auth.signInWithOtp({ phone: body.phone, options: { shouldCreateUser: true } });
    if (error) {
      logger.warn("auth", "Supabase OTP send failed", { channel: body.channel, error: error.message });
      throw new HttpError(400, error.message, "otp_send_failed");
    }
    return json({ ok: true, mode: "supabase" as const });
  }

  if (!isDevAuthEnabled) throw new HttpError(503, "Authentication is not configured", "auth_unconfigured");
  logger.info("auth", "Dev OTP issued (no message sent)", { channel: body.channel });
  return json({ ok: true, mode: "dev" as const });
});
