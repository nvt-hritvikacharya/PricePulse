import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { assertCurrentSecret, credentialKind } from "@/server/auth/accounts";
import { dateOfBirth, GENDERS, indianPhone } from "@/features/auth/schemas";

const MAX_AVATAR_BYTES = 400_000;

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: indianPhone.optional().or(z.literal("")),
  dateOfBirth: dateOfBirth.optional().or(z.literal("")),
  gender: z.enum(GENDERS).optional().or(z.literal("")),
  theme: z.enum(["light", "dark", "system"]).optional(),
  /** Required to change the email or mobile number (they are sign-in identifiers). */
  currentSecret: z.string().max(128).optional(),
  /** Small (client-resized) data URL, or an https URL (e.g. Google avatar / Supabase Storage). */
  avatarUrl: z
    .string()
    .refine((v) => v === "" || v.startsWith("https://") || /^data:image\/(png|jpeg|webp);base64,/.test(v), "Unsupported image")
    .refine((v) => v.length <= MAX_AVATAR_BYTES, "Image too large (max ~300 KB)")
    .optional(),
});

export const GET = handler(async () => {
  const me = await requireUser();
  const user = await db.user.findUniqueOrThrow({
    where: { id: me.id },
    include: {
      notificationPreference: true,
      _count: { select: { priceAlerts: true, wishlist: true, favorites: true, recentlyViewed: true, searchHistory: true } },
    },
  });
  return json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      role: user.role,
      theme: user.theme,
      authMethod: user.authMethod,
      credential: credentialKind(user),
      hasPassword: Boolean(user.passwordHash),
      createdAt: user.createdAt,
      counts: user._count,
    },
  });
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireUser();
  const { currentSecret, ...data } = patchSchema.parse(await req.json());
  const current = await db.user.findUniqueOrThrow({ where: { id: me.id }, select: { email: true, phone: true } });
  const email = data.email === "" ? null : data.email;
  const phone = data.phone === "" ? null : data.phone;
  const changesEmail = email !== undefined && email !== current.email;
  const changesPhone = phone !== undefined && phone !== current.phone;
  if (changesEmail || changesPhone) {
    await assertCurrentSecret(me.id, currentSecret);
    if (!(email === undefined ? current.email : email) && !(phone === undefined ? current.phone : phone)) {
      throw new HttpError(400, "Keep an email or a mobile number to sign in with", "identifier_required");
    }
  }
  try {
    await db.user.update({
      where: { id: me.id },
      data: {
        ...data,
        email,
        phone,
        dateOfBirth: data.dateOfBirth === undefined ? undefined : data.dateOfBirth === "" ? null : new Date(`${data.dateOfBirth}T00:00:00Z`),
        gender: data.gender === "" ? null : data.gender,
        avatarUrl: data.avatarUrl === "" ? null : data.avatarUrl,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new HttpError(409, "That email or phone is already used by another account", "conflict");
    throw err;
  }
  return json({ ok: true });
});
