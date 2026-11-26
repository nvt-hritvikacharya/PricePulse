import "server-only";
import webpush from "web-push";
import { db } from "@/lib/db";
import { env, vapidPublicKey } from "@/lib/env";
import { logger } from "@/lib/logger";

let configured = false;
export const isPushConfigured = () => Boolean(vapidPublicKey && env.VAPID_PRIVATE_KEY);

function ensureConfigured() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(env.VAPID_SUBJECT, vapidPublicKey!, env.VAPID_PRIVATE_KEY!);
  configured = true;
}

/** Sends a Web Push notification to all of a user's subscriptions; prunes expired ones. */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }): Promise<number> {
  if (!isPushConfigured()) return 0;
  ensureConfigured();
  const subs = await db.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload));
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: s.id } }).catch(() => undefined);
        else logger.warn("push", "Push send failed", { userId, status, error: (err as Error).message });
      }
    }),
  );
  return sent;
}
