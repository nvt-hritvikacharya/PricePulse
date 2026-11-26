import "server-only";
import { db } from "@/lib/db";
import type { OfferDTO } from "@/features/search/types";
import type { RetailerId } from "@/features/retailers/retailers";
import { toOfferDTO } from "./catalog-store";
import { sortOffers } from "./search-service";

export interface ReviewSummary {
  averageRating: number | null;
  totalRatings: number;
  distribution: Record<string, number>;
  pros: string[];
  cons: string[];
}

export interface ProductDetail {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  description: string | null;
  specs: Record<string, string>;
  reviewSummary: ReviewSummary | null;
  isMock: boolean;
  offers: OfferDTO[];
  bestOffer: OfferDTO | null;
  updatedAt: string;
}

export async function getProduct(idOrSlug: string): Promise<ProductDetail | null> {
  const product = await db.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { offers: true },
  });
  if (!product) return null;
  const inStock = product.offers.filter((o) => o.availability !== "OUT_OF_STOCK");
  const cheapest = Math.min(...(inStock.length ? inStock : product.offers).map((o) => Number(o.price)));
  const offers = sortOffers(
    product.offers.map((o) => toOfferDTO(o, product, Number(o.price) === cheapest)),
    "lowest_price",
  );
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    category: product.category,
    imageUrl: product.imageUrl,
    description: product.description,
    specs: (product.specs as Record<string, string> | null) ?? {},
    reviewSummary: product.reviewSummary as ReviewSummary | null,
    isMock: product.isMock,
    offers,
    bestOffer: offers.find((o) => o.isBestPrice) ?? offers[0] ?? null,
    updatedAt: product.updatedAt.toISOString(),
  };
}

export interface HistoryPoint {
  date: string;
  best: number;
  [retailer: string]: number | string;
}

export interface PriceHistory {
  days: number;
  points: HistoryPoint[];
  retailers: RetailerId[];
  stats: { lowest: number | null; highest: number | null; average: number | null; current: number | null; lowestOn: string | null; changePercent: number | null };
}

/** Daily price series (lowest price per retailer per day) + window stats. */
export async function getPriceHistory(productId: string, days: 30 | 90): Promise<PriceHistory> {
  const since = new Date(Date.now() - days * 86_400_000);
  const snaps = await db.priceSnapshot.findMany({
    where: { productId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
    select: { retailer: true, price: true, capturedAt: true },
  });

  const byDay = new Map<string, Map<string, number>>();
  for (const s of snaps) {
    const day = s.capturedAt.toISOString().slice(0, 10);
    const row = byDay.get(day) ?? new Map<string, number>();
    const price = Number(s.price);
    row.set(s.retailer, Math.min(price, row.get(s.retailer) ?? Infinity));
    byDay.set(day, row);
  }

  const retailers = [...new Set(snaps.map((s) => s.retailer))] as RetailerId[];
  const points: HistoryPoint[] = [...byDay.entries()].map(([date, row]) => {
    const point: HistoryPoint = { date, best: Math.min(...row.values()) };
    for (const [r, p] of row) point[r] = p;
    return point;
  });

  const bests = points.map((p) => p.best);
  const lowest = bests.length ? Math.min(...bests) : null;
  const highest = bests.length ? Math.max(...bests) : null;
  const average = bests.length ? Math.round(bests.reduce((a, b) => a + b, 0) / bests.length) : null;
  const current = bests.at(-1) ?? null;
  const first = bests[0];
  return {
    days,
    points,
    retailers,
    stats: {
      lowest,
      highest,
      average,
      current,
      lowestOn: lowest !== null ? (points.find((p) => p.best === lowest)?.date ?? null) : null,
      changePercent: current !== null && first ? Math.round(((current - first) / first) * 1000) / 10 : null,
    },
  };
}

export async function getRelatedProducts(productId: string, category: string | null, brand: string | null, take = 6) {
  const products = await db.product.findMany({
    where: { id: { not: productId }, OR: [{ category: category ?? undefined }, { brand: brand ?? undefined }] },
    include: { offers: { orderBy: { price: "asc" }, take: 1 } },
    orderBy: [{ viewCount: "desc" }, { updatedAt: "desc" }],
    take,
  });
  return products
    .filter((p) => p.offers.length)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand,
      imageUrl: p.imageUrl,
      bestPrice: Number(p.offers[0].price),
      retailer: p.offers[0].retailer as RetailerId,
      isMock: p.isMock,
    }));
}

/** Prisma include + mapper for compact product cards (wishlist, favourites, alerts...). */
export const productCardInclude = { offers: { orderBy: { price: "asc" as const }, take: 1 } };

export function toProductCard(p: {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  isMock: boolean;
  offers: { price: unknown; mrp: unknown; retailer: string }[];
}) {
  const o = p.offers[0];
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    imageUrl: p.imageUrl,
    isMock: p.isMock,
    bestPrice: o ? Number(o.price) : null,
    mrp: o?.mrp ? Number(o.mrp) : null,
    retailer: (o?.retailer ?? null) as RetailerId | null,
  };
}

export type ProductCardDTO = ReturnType<typeof toProductCard>;
