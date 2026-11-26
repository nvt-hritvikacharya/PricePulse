import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { productCardInclude, toProductCard } from "@/server/pricing/product-service";
import { checkAlertsForProducts } from "@/server/notifications/alert-checker";

const createSchema = z.object({
  productId: z.string().min(1),
  targetPrice: z.coerce.number().positive("Target price must be positive").max(10_000_000),
  retailer: z.string().optional().nullable(),
  notifyEmail: z.boolean().default(true),
  notifyPush: z.boolean().default(true),
});

export const GET = handler(async () => {
  const user = await requireUser();
  const alerts = await db.priceAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productCardInclude } },
  });
  return json({
    alerts: alerts.map((a) => ({
      id: a.id,
      targetPrice: Number(a.targetPrice),
      retailer: a.retailer,
      notifyEmail: a.notifyEmail,
      notifyPush: a.notifyPush,
      active: a.active,
      lastNotifiedAt: a.lastNotifiedAt,
      triggeredPrice: a.triggeredPrice ? Number(a.triggeredPrice) : null,
      createdAt: a.createdAt,
      product: toProductCard(a.product),
    })),
  });
});

export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await req.json());
  const product = await db.product.findUnique({ where: { id: body.productId } });
  if (!product) throw new HttpError(404, "Product not found", "not_found");
  const retailer = body.retailer || null;
  const existing = await db.priceAlert.findFirst({ where: { userId: user.id, productId: body.productId, retailer, active: true } });
  if (!existing) {
    const count = await db.priceAlert.count({ where: { userId: user.id, active: true } });
    if (count >= 50) throw new HttpError(400, "You can have at most 50 active alerts", "limit");
  }
  const data = { targetPrice: body.targetPrice, notifyEmail: body.notifyEmail, notifyPush: body.notifyPush };
  // One active alert per product+store: re-submitting updates the target instead of duplicating.
  const alert = existing
    ? await db.priceAlert.update({ where: { id: existing.id }, data: { ...data, lastNotifiedAt: null, triggeredPrice: null } })
    : await db.priceAlert.create({ data: { userId: user.id, productId: body.productId, retailer, ...data } });
  // Fire immediately if the target is already met.
  await checkAlertsForProducts([body.productId]);
  const fresh = await db.priceAlert.findUniqueOrThrow({ where: { id: alert.id } });
  return json({ id: alert.id, updated: Boolean(existing), triggered: Boolean(fresh.lastNotifiedAt) }, { status: existing ? 200 : 201 });
});
