import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { cached } from "@/lib/redis";
import { requireUser } from "@/features/auth/server/session";

const FALLBACK = ["iPhone 16", "Samsung Galaxy S25 Ultra", "Sony WH-1000XM5", "MacBook Air M4", "Nike running shoes", "Air fryer", "Amul butter", "Smart TV 55 inch"];

/** Popular searches (last 7 days) + trending products. */
export const GET = handler(async () => {
  await requireUser();
  const { value } = await cached("popular:v1", 300, async () => {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [queries, products] = await Promise.all([
      db.searchHistory.groupBy({
        by: ["normalized"],
        where: { createdAt: { gte: since } },
        _count: { normalized: true },
        orderBy: { _count: { normalized: "desc" } },
        take: 8,
      }),
      db.product.findMany({
        orderBy: [{ viewCount: "desc" }, { compareCount: "desc" }],
        take: 8,
        include: { offers: { orderBy: { price: "asc" }, take: 1 } },
      }),
    ]);
    const popular = queries.map((q) => q.normalized);
    for (const f of FALLBACK) if (popular.length < 8 && !popular.includes(f.toLowerCase())) popular.push(f);
    return {
      popular,
      trending: products
        .filter((p) => p.offers.length)
        .map((p) => ({ id: p.id, slug: p.slug, name: p.name, brand: p.brand, imageUrl: p.imageUrl, bestPrice: Number(p.offers[0].price), mrp: p.offers[0].mrp ? Number(p.offers[0].mrp) : null, retailer: p.offers[0].retailer, isMock: p.isMock })),
    };
  });
  return json(value);
});
