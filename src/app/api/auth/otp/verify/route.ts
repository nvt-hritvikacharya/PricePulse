import { handler, HttpError, json } from "@/lib/api";
import { env, isDevAuthEnabled, isPublicDemoAuth, isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { verifyOtpSchema } from "@/features/auth/schemas";
import { createSupabaseServerClient } from "@/features/auth/server/supabase";
import { startSession, upsertUser } from "@/features/auth/server/session";
import { authorizeDemoLogin } from "@/features/auth/server/demo-auth";

/** Verifies the OTP, upserts the local user and starts a 1-hour sliding session. */
export const POST = handler(async (req: Request) => {
  const body = verifyOtpSchema.parse(await req.json());
  const limit = await rateLimit(`otp:verify:${clientIp(req.headers)}`, 20, 600);
  if (!limit.ok) throw new HttpError(429, "Too many attempts. Try again later.", "rate_limited");

  let identity: Parameters<typeof upsertUser>[0];

  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    const { data, error } =
      body.channel === "email"
        ? await supabase.auth.verifyOtp({ email: body.email, token: body.token, type: "email" })
        : await supabase.auth.verifyOtp({ phone: body.phone, token: body.token, type: "sms" });
    if (error || !data.user) throw new HttpError(400, error?.message ?? "Invalid or expired code", "otp_invalid");
    identity = {
      supabaseId: data.user.id,
      email: data.user.email,
      phone: data.user.phone ? `+${data.user.phone.replace(/^\+/, "")}` : body.channel === "phone" ? body.phone : null,
      name: (data.user.user_metadata?.full_name as string | undefined) ?? null,
      method: body.channel === "email" ? "EMAIL_OTP" : "PHONE_OTP",
    };
  } else {
    if (!isDevAuthEnabled) throw new HttpError(503, "Authentication is not configured", "auth_unconfigured");
    if (body.token !== env.DEV_OTP_CODE) throw new HttpError(400, "Invalid code. In dev mode use the code shown on screen.", "otp_invalid");
    const email = body.channel === "email" ? body.email : null;
    const phone = body.channel === "phone" ? body.phone : null;
    const demoDeviceHash = isPublicDemoAuth ? await authorizeDemoLogin({ email, phone }) : null;
    identity = { email, phone, method: "DEV", demoDeviceHash };
  }

  const user = await upsertUser(identity);
  await startSession(user);
  return json({ ok: true, user: { id: user.id, name: user.name, role: user.role } });
});
