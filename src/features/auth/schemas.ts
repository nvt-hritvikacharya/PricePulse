import { z } from "zod";

/** Indian mobile numbers: optional +91 prefix, 10 digits starting 6-9. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

const email = z.string().trim().toLowerCase().email("Enter a valid email address");
const otpCode = z.string().regex(/^\d{6}$/, "Enter the 6-digit code");
const channel = z.enum(["email", "phone"]);

export const GENDERS = ["female", "male", "non_binary", "prefer_not_to_say"] as const;
export type Gender = (typeof GENDERS)[number];
export const GENDER_LABELS: Record<Gender, string> = {
  female: "Female",
  male: "Male",
  non_binary: "Non-binary",
  prefer_not_to_say: "Prefer not to say",
};

const MIN_AGE = 13;

/** ISO date (YYYY-MM-DD) for someone aged 13–120. */
export const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth")
  .refine((v) => {
    const dob = new Date(`${v}T00:00:00Z`);
    if (Number.isNaN(dob.getTime())) return false;
    const now = new Date();
    const age = now.getUTCFullYear() - dob.getUTCFullYear() - (now < new Date(Date.UTC(now.getUTCFullYear(), dob.getUTCMonth(), dob.getUTCDate())) ? 1 : 0);
    return age >= MIN_AGE && age <= 120;
  }, `You must be at least ${MIN_AGE} years old`);

export const signupProfileSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  email,
  phone: indianPhone,
  dateOfBirth,
  gender: z.enum(GENDERS, { message: "Select an option" }),
});
export type SignupProfile = z.infer<typeof signupProfileSchema>;

/** Sign in: code goes to the email or mobile number of an existing account. */
export const sendOtpSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), email }),
  z.object({ channel: z.literal("phone"), phone: indianPhone }),
]);

export const verifyOtpSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("email"), email, token: otpCode }),
  z.object({ channel: z.literal("phone"), phone: indianPhone, token: otpCode }),
]);

/** Sign up: both identifiers are checked for uniqueness; the code goes to `channel`. */
export const signupSendSchema = z.object({ channel, email, phone: indianPhone });
export const signupVerifySchema = signupProfileSchema.extend({ channel, token: otpCode });
