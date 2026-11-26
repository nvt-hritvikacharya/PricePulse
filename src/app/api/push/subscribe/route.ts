import { z } from "zod";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Stores a browser PushSubscription for the current user. */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const sub = schema.parse(await req.json());
  await db.pushSubscription.upsert({
    where: { endpoint: sub.endpoint },
    create: { userId: user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    update: { userId: user.id, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
  return json({ ok: true });
});

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const { endpoint } = z.object({ endpoint: z.string() }).parse(await req.json());
  await db.pushSubscription.deleteMany({ where: { userId: user.id, endpoint } });
  return json({ ok: true });
});
