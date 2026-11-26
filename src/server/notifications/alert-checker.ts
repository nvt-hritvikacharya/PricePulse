import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { formatINR } from "@/lib/utils";
import { getRetailer } from "@/features/retailers/retailers";
import { priceDropEmail, sendEmail } from "./email";
import { sendPushToUser } from "./push";

const RENOTIFY_AFTER_MS = 24 * 3600 * 1000;

/**
 * Evaluates active price alerts (optionally limited to some products) against the latest
 * offers and notifies users through email / web push / in-app inbox.
 */
export async function checkAlertsForProducts(productIds?: string[]): Promise<{ checked: number; triggered: number }> {
  const alerts = await db.priceAlert.findMany({
    where: { active: true, ...(productIds ? { productId: { in: productIds } } : {}) },
    include: {
      product: { include: { offers: true } },
      user: { include: { notificationPreference: true } },
    },
    take: 1000,
  });

  let triggered = 0;
  for (const alert of alerts) {
    const candidates = alert.product.offers.filter(
      (o) => o.availability !== "OUT_OF_STOCK" && (!alert.retailer || o.retailer === alert.retailer),
    );
    const best = candidates.sort((a, b) => Number(a.price) - Number(b.price))[0];
    const now = new Date();
    if (!best || Number(best.price) > Number(alert.targetPrice)) {
      await db.priceAlert.update({ where: { id: alert.id }, data: { lastCheckedAt: now } });
      continue;
    }
    const price = Number(best.price);
    const recentlyNotified = alert.lastNotifiedAt && now.getTime() - alert.lastNotifiedAt.getTime() < RENOTIFY_AFTER_MS;
    const cheaperThanLast = alert.triggeredPrice === null || price < Number(alert.triggeredPrice);
    if (recentlyNotified && !cheaperThanLast) {
      await db.priceAlert.update({ where: { id: alert.id }, data: { lastCheckedAt: now } });
      continue;
    }

    const prefs = alert.user.notificationPreference;
    const retailerName = getRetailer(best.retailer)?.name ?? best.retailer;
    const url = `${env.NEXT_PUBLIC_APP_URL}/product/${alert.product.slug}`;
    const title = `Price drop: ${alert.product.name.slice(0, 60)}`;
    const body = `Now ${formatINR(price)} on ${retailerName} (target ${formatINR(Number(alert.targetPrice))})`;
    const channels: string[] = ["in_app"];

    if (alert.notifyEmail && (prefs?.emailAlerts ?? true) && alert.user.email) {
      const mail = priceDropEmail({
        name: alert.user.name,
        productName: alert.product.name,
        price: formatINR(price),
        target: formatINR(Number(alert.targetPrice)),
        retailer: retailerName,
        url,
      });
      if (await sendEmail(alert.user.email, mail.subject, mail.html, mail.text)) channels.push("email");
      else channels.push("email_logged");
    }
    if (alert.notifyPush && (prefs?.pushAlerts ?? true)) {
      const sent = await sendPushToUser(alert.userId, { title, body, url: `/product/${alert.product.slug}` });
      if (sent) channels.push("push");
    }

    await db.$transaction([
      db.notification.create({ data: { userId: alert.userId, title, body, url: `/product/${alert.product.slug}`, channels } }),
      db.priceAlert.update({ where: { id: alert.id }, data: { lastCheckedAt: now, lastNotifiedAt: now, triggeredPrice: price } }),
    ]);
    triggered++;
    logger.info("alerts", "Price alert triggered", { alertId: alert.id, userId: alert.userId, price, channels });
  }
  return { checked: alerts.length, triggered };
}
