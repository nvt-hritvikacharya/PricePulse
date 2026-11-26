import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { db } from "@/lib/db";
import { HttpError } from "@/lib/api";
import { emailOtpProvider, env, smsOtpProvider } from "@/lib/env";
import { logger } from "@/lib/logger";
import { secret } from "@/features/auth/session-token";

/**
 * One-time passwords for sign-in and sign-up.
 *  - Email: we generate the code, store only its HMAC, and send it via Resend (or SMTP).
 *  - SMS: Twilio Verify generates, sends (DLT-compliant in India) and checks the code.
 * Codes expire after 10 minutes and allow 5 attempts; requesting a new code voids older ones.
 */
export type OtpChannel = "email" | "phone";
export type OtpPurpose = "signin" | "signup";

const TTL_MS = 10 * 60_000;
export const MAX_OTP_ATTEMPTS = 5;

export function otpAvailability() {
  return { email: emailOtpProvider !== null, phone: smsOtpProvider !== null, devLog: emailOtpProvider === "log" || smsOtpProvider === "log" };
}

async function hashCode(challengeId: string, code: string): Promise<string> {
  return createHmac("sha256", await secret()).update(`otp:${challengeId}:${code}`).digest("hex");
}

export async function sendOtp(channel: OtpChannel, target: string, purpose: OtpPurpose): Promise<void> {
  const provider = channel === "email" ? emailOtpProvider : smsOtpProvider;
  if (!provider) {
    throw new HttpError(503, `Sending codes by ${channel === "email" ? "email" : "SMS"} isn't set up yet. Try the other option.`, "otp_unavailable");
  }

  await db.otpChallenge.updateMany({ where: { target, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  const challenge = await db.otpChallenge.create({
    data: { channel, target, purpose, provider, expiresAt: new Date(Date.now() + TTL_MS) },
  });

  try {
    if (provider === "twilio_verify") {
      await twilio("Verifications", { To: target, Channel: "sms" });
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { codeHash: await hashCode(challenge.id, code) } });
    if (provider === "log") {
      // Development only (never selected in production): stands in for a real inbox/phone.
      console.info(`[otp] ${channel} code for ${target}: ${code}`);
      return;
    }
    const mail = otpEmail(code, purpose);
    if (provider === "resend") await sendViaResend(target, mail);
    else await sendViaSmtp(target, mail);
  } catch (err) {
    await db.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    if (err instanceof HttpError) throw err;
    logger.error("auth", "OTP delivery failed", { channel, provider, error: (err as Error).message });
    throw new HttpError(502, "We couldn't send the code right now. Please try again.", "otp_send_failed");
  }
}

/** Throws unless `code` is the latest valid code for this target. Consumes it on success. */
export async function verifyOtp(channel: OtpChannel, target: string, purpose: OtpPurpose, code: string): Promise<void> {
  const challenge = await db.otpChallenge.findFirst({
    where: { channel, target, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) throw new HttpError(400, "This code has expired. Request a new one.", "otp_expired");

  const counted = await db.otpChallenge.updateMany({
    where: { id: challenge.id, attempts: { lt: MAX_OTP_ATTEMPTS }, consumedAt: null },
    data: { attempts: { increment: 1 } },
  });
  if (counted.count === 0) throw new HttpError(429, "Too many wrong attempts. Request a new code.", "otp_locked");

  let ok: boolean;
  if (challenge.provider === "twilio_verify") {
    const res = await twilio("VerificationCheck", { To: target, Code: code }).catch((err: Error) => {
      logger.warn("auth", "Twilio Verify check failed", { error: err.message });
      return null;
    });
    ok = res?.status === "approved";
  } else {
    const expected = Buffer.from(challenge.codeHash ?? "", "hex");
    const actual = Buffer.from(await hashCode(challenge.id, code), "hex");
    ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  }
  if (!ok) {
    const left = MAX_OTP_ATTEMPTS - challenge.attempts - 1;
    throw new HttpError(400, left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Incorrect code. Request a new one.", "otp_invalid");
  }

  const consumed = await db.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (consumed.count === 0) throw new HttpError(400, "This code was already used. Request a new one.", "otp_expired");
}

// --- delivery -----------------------------------------------------------------------

function otpEmail(code: string, purpose: OtpPurpose) {
  const action = purpose === "signup" ? "finish creating your account" : "sign in";
  const subject = `${code} is your PricePulse India code`;
  const text = `Your PricePulse India code is ${code}.\n\nUse it to ${action}. It expires in 10 minutes. If you didn't request it, ignore this email.`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border-radius:16px;background:#0f172a;color:#e2e8f0">
  <h2 style="margin:0 0 8px;color:#fff">Your PricePulse India code</h2>
  <p>Use this code to ${action}:</p>
  <p style="font-size:32px;font-weight:700;letter-spacing:8px;color:#fff;margin:16px 0">${code}</p>
  <p style="color:#94a3b8">It expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
</div>`;
  return { subject, text, html };
}

const fromAddress = () => env.OTP_EMAIL_FROM ?? env.EMAIL_FROM;

async function sendViaResend(to: string, mail: { subject: string; text: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: fromAddress(), to: [to], ...mail }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}`);
}

let smtp: Transporter | null = null;
async function sendViaSmtp(to: string, mail: { subject: string; text: string; html: string }) {
  smtp ??= nodemailer.createTransport(env.SMTP_URL!);
  await smtp.sendMail({ from: fromAddress(), to, ...mail });
}

async function twilio(endpoint: "Verifications" | "VerificationCheck", params: Record<string, string>): Promise<{ status?: string }> {
  const sid = env.TWILIO_VERIFY_SERVICE_SID ?? "";
  if (!/^VA[0-9a-f]{32}$/i.test(sid)) throw new Error("TWILIO_VERIFY_SERVICE_SID is not a Verify service SID");
  const auth = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://verify.twilio.com/v2/Services/${sid}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
    signal: AbortSignal.timeout(10_000),
  });
  if (res.status === 404 && endpoint === "VerificationCheck") return { status: "expired" };
  if (!res.ok) throw new Error(`Twilio Verify responded ${res.status}`);
  return (await res.json()) as { status?: string };
}
