import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

/** In-app notification inbox. */
export const GET = handler(async () => {
  const user = await requireUser();
  const [items, unread] = await Promise.all([
    db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);
  return json({ items, unread });
});

/** Marks all as read. */
export const PATCH = handler(async () => {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  return json({ ok: true });
});
