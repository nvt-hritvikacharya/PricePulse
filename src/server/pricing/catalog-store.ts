import "server-only";
import { Prisma, type Offer, type Product } from "@prisma/client";
import { db } from "@/lib/db";
import { slugify, discountPercent } from "@/lib/utils";
import type { OfferDTO } from "@/features/search/types";
import type { RetailerId } from "@/features/retailers/retailers";
import { mockHistory, productSlug } from "../providers/mock/pricing";
import { buildReviewSummary } from "./review-summary";
import type { ProviderOffer } from "../providers/types";
import type { OfferGroup } from "./matcher";
import { isPlaceholderImage } from "../images/image-search";

const SNAPSHOT_MIN_INTERVAL_MS = 60 * 60 * 1000;

/** Converts a persisted offer into the API DTO. */
export function toOfferDTO(offer: Offer, product: Pick<Product, "id" | "slug" | "name" | "brand" | "category" | "imageUrl" | "releasedAt">, isBestPrice = false): OfferDTO {
  const price = Number(offer.price);
  const mrp = offer.mrp ? Number(offer.mrp) : null;
  return {
    id: offer.id,
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    title: offer.title,
    brand: product.brand,
    category: product.category,
    imageUrl: isPlaceholderImage(product.imageUrl) ? (offer.imageUrl ?? product.imageUrl) : product.imageUrl,
    retailer: offer.retailer as RetailerId,
    providerId: offer.providerId,
    url: offer.url,
    price,
    mrp,
    discountPercent: discountPercent(price, mrp),
    deliveryCharge: offer.deliveryCharge !== null ? Number(offer.deliveryCharge) : null,
    deliveryEtaDays: offer.deliveryEtaDays,
    sellerName: offer.sellerName,
    sellerRating: offer.sellerRating,
    ratingCount: offer.ratingCount,
    availability: offer.availability,
    isMock: offer.isMock,
    isBestPrice,
    releasedAt: product.releasedAt?.toISOString() ?? null,
    fetchedAt: offer.fetchedAt.toISOString(),
  };
}

/**
 * Demo products get 90 days of synthetic daily history from the same deterministic price curve
 * that produced today's price, scaled so the series ends exactly at the current offer.
 */
async function backfillMockHistory(productId: string, matchKey: string, offers: ProviderOffer[]) {
  const key = matchKey.replace(/^mock:/, "");
  const rows: Prisma.PriceSnapshotCreateManyInput[] = offers.flatMap((o) =>
    mockHistory(key, o.retailer, o.price).map(({ day, price }) => ({
      productId,
      retailer: o.retailer,
      price,
      mrp: o.mrp,
      capturedAt: new Date(day * 86_400_000 + 10 * 3_600_000),
      isMock: true,
    })),
  );
  await db.priceSnapshot.createMany({ data: rows });
}

/**
 * Upserts canonical products, their latest per-retailer offers and (throttled) price snapshots.
 * Returns persisted offer DTOs in group order.
 */
export async function persistGroups(groups: OfferGroup[]): Promise<{ offers: OfferDTO[]; productIds: string[] }> {
  const result: OfferDTO[] = [];
  const productIds: string[] = [];

  for (const group of groups) {
    const lead = [...group.offers].sort((a, b) => (b.specs ? 1 : 0) - (a.specs ? 1 : 0))[0] as ProviderOffer;
    const isMock = group.offers.every((o) => o.isMock);
    let product = await db.product.findUnique({ where: { matchKey: group.matchKey } });
    if (!product) {
      try {
        product = await db.product.create({
          data: {
            matchKey: group.matchKey,
            slug: productSlug(slugify(lead.title), group.matchKey),
            name: lead.title,
            brand: lead.brand ?? group.offers.find((o) => o.brand)?.brand,
            category: lead.category ?? group.offers.find((o) => o.category)?.category,
            imageUrl: group.offers.find((o) => o.imageUrl)?.imageUrl,
            description: lead.description,
            specs: lead.specs as Prisma.InputJsonValue | undefined,
            reviewSummary: buildReviewSummary(group.matchKey, group.offers),
            releasedAt: lead.releasedAt ? new Date(lead.releasedAt) : undefined,
            isMock,
          },
        });
        if (isMock) await backfillMockHistory(product.id, group.matchKey, group.offers);
      } catch (err) {
        // Concurrent search created it first.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          product = await db.product.findUniqueOrThrow({ where: { matchKey: group.matchKey } });
        } else throw err;
      }
    } else {
      product = await db.product.update({
        where: { id: product.id },
        data: { compareCount: { increment: 1 }, reviewSummary: buildReviewSummary(group.matchKey, group.offers) },
      });
    }

    const cheapest = Math.min(...group.offers.map((o) => o.price));
    const recent = await db.priceSnapshot.findMany({
      where: { productId: product.id, capturedAt: { gte: new Date(Date.now() - SNAPSHOT_MIN_INTERVAL_MS) } },
      select: { retailer: true },
    });
    const recentRetailers = new Set(recent.map((r) => r.retailer));

    for (const o of group.offers) {
      const data = {
        providerId: o.providerId,
        externalId: o.externalId,
        title: o.title,
        url: o.url,
        imageUrl: o.imageUrl,
        price: o.price,
        mrp: o.mrp,
        deliveryCharge: o.deliveryCharge,
        deliveryEtaDays: o.deliveryEtaDays,
        sellerName: o.sellerName,
        sellerRating: o.sellerRating,
        ratingCount: o.ratingCount,
        availability: o.availability,
        isMock: Boolean(o.isMock),
        fetchedAt: new Date(),
      };
      const saved = await db.offer.upsert({
        where: { productId_retailer: { productId: product.id, retailer: o.retailer } },
        create: { productId: product.id, retailer: o.retailer, ...data },
        update: data,
      });
      if (!recentRetailers.has(o.retailer)) {
        await db.priceSnapshot.create({
          data: { productId: product.id, retailer: o.retailer, price: o.price, mrp: o.mrp, isMock: Boolean(o.isMock) },
        });
      }
      result.push(toOfferDTO(saved, product, o.price === cheapest));
    }
    productIds.push(product.id);
  }
  return { offers: result, productIds };
}
