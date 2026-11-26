import { handler, HttpError, json } from "@/lib/api";
import { env } from "@/lib/env";
import { checkAlertsForProducts } from "@/server/notifications/alert-checker";
import { searchPrices } from "@/server/pricing/search-service";
import { db } from "@/lib/db";

/**
 * Scheduler entry point (e.g. every 30 min via cron / Vercel Cron / k8s CronJob):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/check-alerts
 * Refreshes prices for products with active alerts, then evaluates all alerts.
 */
export const POST = handler(async (req: Request) => {
  const auth = req.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) throw new HttpError(401, "Unauthorized", "unauthorized");
  const watched = await db.product.findMany({
    where: { alerts: { some: { active: true } } },
    select: { name: true },
    take: 50,
  });
  for (const p of watched) await searchPrices(p.name, "lowest_price").catch(() => undefined);
  const result = await checkAlertsForProducts();
  return json({ ok: true, refreshed: watched.length, ...result });
});
