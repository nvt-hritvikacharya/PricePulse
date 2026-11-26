import "server-only";
import { RETAILERS, RETAILER_IDS } from "@/features/retailers/retailers";
import type { PriceProvider, ProviderOffer } from "../types";
import { offerFor, retailersFor, searchCatalog, syntheticProducts } from "../mock/pricing";

/** Builds the deterministic on-site URL that a real deep link would replace. */
function demoUrl(retailer: keyof typeof RETAILERS, query: string) {
  return `https://www.${RETAILERS[retailer].domain}/search?q=${encodeURIComponent(query)}`;
}

/**
 * Mock provider – clearly labelled demo data so the app is fully usable without API keys.
 * Enabled automatically when no real provider is configured (MOCK_PROVIDER=auto).
 */
export const mockProvider: PriceProvider = {
  id: "mock",
  name: "Demo data (mock provider)",
  kind: "mock",
  retailers: RETAILER_IDS,
  rateLimitPerMinute: 10_000,
  requiredEnv: [],
  isConfigured: () => true,

  async search(query, { limit }) {
    // Small artificial latency so loading states are visible in dev.
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 250));
    const products = searchCatalog(query, limit);
    const list = products.length ? products : syntheticProducts(query);
    return list.flatMap((product): ProviderOffer[] =>
      retailersFor(product).map((retailer) => {
        const o = offerFor(product, retailer);
        return {
          providerId: "mock",
          retailer,
          externalId: `${product.key}@${retailer}`,
          title: product.name,
          brand: product.brand,
          category: product.category,
          imageUrl: `/api/img/${product.key}`,
          url: demoUrl(retailer, product.name),
          price: o.price,
          mrp: o.mrp,
          deliveryCharge: o.deliveryCharge,
          deliveryEtaDays: o.deliveryEtaDays,
          sellerName: o.sellerName,
          sellerRating: o.sellerRating,
          ratingCount: o.ratingCount,
          availability: o.availability,
          specs: product.specs,
          description: product.description,
          releasedAt: new Date(Date.now() - product.launchedDaysAgo * 86_400_000).toISOString(),
          matchKey: `mock:${product.key}`,
          isMock: true,
        };
      }),
    );
  },
};
