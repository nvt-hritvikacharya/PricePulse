import { z } from "zod";

/** Indian mobile numbers: optional +91 prefix, 10 digits starting 6-9. */
export const indianPhone = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine((v) => /^(\+91)?[6-9]\d{9}$/.test(v), "Enter a valid 10-digit Indian mobile number")
  .transform((v) => (v.startsWith("+91") ? v : `+91${v}`));

const email = z.string().trim().toLowerCase().email("Enter a valid email address");

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

export const PASSWORD_MIN = 8;
export const password = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`)
  .max(128, "Use at most 128 characters")
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use at least one letter and one number");
export const passcode = z.string().regex(/^\d{6}$/, "Passcode must be exactly 6 digits");

const optionalEmail = email.optional().or(z.literal("").transform(() => undefined));
const optionalPhone = indianPhone.optional().or(z.literal("").transform(() => undefined));
const profileBase = { name: z.string().trim().min(2, "Enter your full name").max(80), dateOfBirth, gender: z.enum(GENDERS, { message: "Select an option" }) };

/**
 * Sign up with Email ID + password, or Mobile number + 6-digit passcode.
 * The other identifier is optional and can sign in with the same secret.
 */
export const signupSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), ...profileBase, email, phone: optionalPhone, secret: password }),
  z.object({ method: z.literal("phone"), ...profileBase, phone: indianPhone, email: optionalEmail, secret: passcode }),
]);
export type SignupInput = z.infer<typeof signupSchema>;

export const signinSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("email"), email, secret: z.string().min(1, "Enter your password").max(128) }),
  z.object({ method: z.literal("phone"), phone: indianPhone, secret: z.string().min(1, "Enter your passcode").max(128) }),
]);

/** A new secret matches the kind the account was created with. */
export const newSecretFor = (kind: "password" | "passcode") => (kind === "password" ? password : passcode);
