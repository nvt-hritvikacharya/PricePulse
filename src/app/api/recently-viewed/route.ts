import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { productCardInclude, toProductCard } from "@/server/pricing/product-service";

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await db.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: "desc" },
    take: 20,
    include: { product: { include: productCardInclude } },
  });
  return json({ items: rows.map((r) => ({ id: r.id, viewedAt: r.viewedAt, product: toProductCard(r.product) })) });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await db.recentlyViewed.deleteMany({ where: { userId: user.id } });
  return json({ ok: true });
});
