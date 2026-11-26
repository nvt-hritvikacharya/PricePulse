import "server-only";
import { env } from "@/lib/env";
import { fetchJson } from "../resilient";
import type { PriceProvider, ProviderOffer } from "../types";

/**
 * Flipkart Affiliate API – product search feed.
 * Docs: https://affiliate.flipkart.com/api-docs/  (Fk-Affiliate-Id / Fk-Affiliate-Token headers)
 */
interface Money {
  amount: number;
  currency: string;
}
interface FkProduct {
  productBaseInfoV1: {
    productId: string;
    title: string;
    productBrand?: string;
    productUrl: string;
    imageUrls?: Record<string, string>;
    maximumRetailPrice?: Money;
    flipkartSellingPrice?: Money;
    flipkartSpecialPrice?: Money;
    inStock?: boolean;
    categoryPath?: string;
    productDescription?: string;
    attributes?: Record<string, string>;
  };
  productShippingInfoV1?: {
    shippingCharges?: Money;
    sellerName?: string;
    sellerAverageRating?: number;
    sellerNoOfRatings?: number;
  };
}

export const flipkartAffiliateProvider: PriceProvider = {
  id: "flipkart-affiliate",
  name: "Flipkart Affiliate API",
  kind: "official-api",
  retailers: ["flipkart"],
  rateLimitPerMinute: 60,
  requiredEnv: ["FLIPKART_AFFILIATE_ID", "FLIPKART_AFFILIATE_TOKEN"],
  isConfigured: () => Boolean(env.FLIPKART_AFFILIATE_ID && env.FLIPKART_AFFILIATE_TOKEN),

  async search(query, { limit, signal }) {
    const url = new URL("https://affiliate-api.flipkart.net/affiliate/1.0/search.json");
    url.searchParams.set("query", query);
    url.searchParams.set("resultCount", String(Math.min(10, limit)));
    const data = await fetchJson<{ products?: FkProduct[] }>(url.toString(), {
      headers: {
        "Fk-Affiliate-Id": env.FLIPKART_AFFILIATE_ID!,
        "Fk-Affiliate-Token": env.FLIPKART_AFFILIATE_TOKEN!,
        Accept: "application/json",
      },
      signal,
    });

    return (data.products ?? []).flatMap((p): ProviderOffer[] => {
      const b = p.productBaseInfoV1;
      const price = b.flipkartSpecialPrice?.amount ?? b.flipkartSellingPrice?.amount;
      if (!price) return [];
      const images = b.imageUrls ?? {};
      return [
        {
          providerId: "flipkart-affiliate",
          retailer: "flipkart",
          externalId: b.productId,
          title: b.title,
          brand: b.productBrand,
          category: b.categoryPath?.split(">").pop()?.trim(),
          imageUrl: images["400x400"] ?? images["800x800"] ?? Object.values(images)[0],
          url: b.productUrl,
          price,
          mrp: b.maximumRetailPrice?.amount,
          deliveryCharge: p.productShippingInfoV1?.shippingCharges?.amount,
          deliveryEtaDays: 3,
          sellerName: p.productShippingInfoV1?.sellerName,
          sellerRating: p.productShippingInfoV1?.sellerAverageRating,
          ratingCount: p.productShippingInfoV1?.sellerNoOfRatings,
          availability: b.inStock === false ? "OUT_OF_STOCK" : "IN_STOCK",
          description: b.productDescription,
          specs: b.attributes,
        },
      ];
    });
  },
};
