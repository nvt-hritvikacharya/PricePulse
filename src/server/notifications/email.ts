import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

let transporter: Transporter | null = null;

export const isEmailConfigured = () => Boolean(env.SMTP_URL);

/** Sends an email via SMTP. Without SMTP_URL the message is logged (dev mailbox). */
export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!env.SMTP_URL) {
    logger.info("email", "SMTP not configured – email logged instead of sent", { to, subject });
    return false;
  }
  transporter ??= nodemailer.createTransport(env.SMTP_URL);
  try {
    await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html, text });
    return true;
  } catch (err) {
    logger.error("email", "Failed to send email", { to, subject, error: (err as Error).message });
    return false;
  }
}

export function priceDropEmail(opts: { name: string | null; productName: string; price: string; target: string; retailer: string; url: string }) {
  const subject = `Price drop: ${opts.productName} is now ${opts.price}`;
  const text = `Hi ${opts.name ?? "there"},\n\n${opts.productName} dropped to ${opts.price} on ${opts.retailer} (your target: ${opts.target}).\n\nView: ${opts.url}\n\n– PricePulse India`;
  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border-radius:16px;background:#0f172a;color:#e2e8f0">
  <h2 style="margin:0 0 8px;color:#fff">Price drop alert 🎯</h2>
  <p>Hi ${opts.name ?? "there"}, <b>${opts.productName}</b> is now <b style="color:#34d399">${opts.price}</b> on ${opts.retailer}.</p>
  <p style="color:#94a3b8">Your target price was ${opts.target}.</p>
  <a href="${opts.url}" style="display:inline-block;margin-top:12px;padding:10px 18px;border-radius:999px;background:#f97316;color:#fff;text-decoration:none">View deal</a>
</div>`;
  return { subject, text, html };
}
