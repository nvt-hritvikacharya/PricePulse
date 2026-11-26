import { z } from "zod";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { isEmailConfigured } from "@/server/notifications/email";
import { isPushConfigured } from "@/server/notifications/push";
import { vapidPublicKey } from "@/lib/env";

const schema = z.object({
  emailAlerts: z.boolean(),
  pushAlerts: z.boolean(),
  weeklyDigest: z.boolean(),
  priceDropOnly: z.boolean(),
  minDropPercent: z.coerce.number().int().min(1).max(90),
});

export const GET = handler(async () => {
  const user = await requireUser();
  const prefs = await db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} });
  return json({ preferences: prefs, capabilities: { email: isEmailConfigured(), push: isPushConfigured() }, vapidPublicKey: isPushConfigured() ? vapidPublicKey : null });
});

export const PUT = handler(async (req: Request) => {
  const user = await requireUser();
  const data = schema.parse(await req.json());
  const prefs = await db.notificationPreference.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  return json({ preferences: prefs });
});
