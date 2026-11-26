import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { indianPhone } from "@/features/auth/schemas";

const MAX_AVATAR_BYTES = 400_000;

const patchSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: indianPhone.optional().or(z.literal("")),
  theme: z.enum(["light", "dark", "system"]).optional(),
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
      avatarUrl: user.avatarUrl,
      role: user.role,
      theme: user.theme,
      authMethod: user.authMethod,
      createdAt: user.createdAt,
      counts: user._count,
    },
  });
});

export const PATCH = handler(async (req: Request) => {
  const me = await requireUser();
  const data = patchSchema.parse(await req.json());
  try {
    await db.user.update({
      where: { id: me.id },
      data: {
        ...data,
        email: data.email === "" ? null : data.email,
        phone: data.phone === "" ? null : data.phone,
        avatarUrl: data.avatarUrl === "" ? null : data.avatarUrl,
      },
    });
  } catch (err) {
    if ((err as { code?: string }).code === "P2002") throw new HttpError(409, "That email or phone is already used by another account", "conflict");
    throw err;
  }
  return json({ ok: true });
});
