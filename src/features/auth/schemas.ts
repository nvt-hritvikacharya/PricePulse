import { z } from "zod";

/** Indian mobile numbers: optional +91 prefix, 10 digits starting 6-9. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

export const sendOtpSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), email: z.string().trim().toLowerCase().email("Enter a valid email address") }),
  z.object({ channel: z.literal("phone"), phone: indianPhone }),
]);

export const verifyOtpSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), email: z.string().trim().toLowerCase().email(), token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }),
  z.object({ channel: z.literal("phone"), phone: indianPhone, token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code") }),
]);
