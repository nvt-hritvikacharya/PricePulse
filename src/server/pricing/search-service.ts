import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { cached } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { normalizeQuery } from "@/lib/utils";
import type { OfferDTO, ProviderStatusDTO, SearchResponse, SortKey } from "@/features/search/types";
import { getActiveProviders, isDemoMode } from "../providers/registry";
import { resilientSearch } from "../providers/resilient";
import { groupOffers } from "./matcher";
import { persistGroups } from "./catalog-store";
import { checkAlertsForProducts } from "../notifications/alert-checker";
import { ensureProductImages } from "../images/product-images";

interface Aggregate {
  offers: OfferDTO[];
  productIds: string[];
  providers: ProviderStatusDTO[];
}

/** Fan out to every active provider in parallel, merge + persist the results. */
async function aggregate(query: string): Promise<Aggregate> {
  const providers = getActiveProviders();
  const settled = await Promise.all(
    providers.map(async (p) => {
      const { offers, error } = await resilientSearch(p, query, 12);
      return { provider: p, offers, error };
    }),
  );
  const allOffers = settled.flatMap((s) => s.offers);
  const groups = groupOffers(allOffers).slice(0, 24);
  const persisted = await persistGroups(groups);
  const productIds = persisted.productIds;
  const products = [...new Map(persisted.offers.map((o) => [o.productId, { id: o.productId, name: o.productName, imageUrl: o.imageUrl }])).values()];
  const images = await ensureProductImages(products);
  const offers = images.size ? persisted.offers.map((o) => (images.has(o.productId) ? { ...o, imageUrl: images.get(o.productId)! } : o)) : persisted.offers;
  return {
    offers,
    productIds,
    providers: settled.map((s) => ({
      id: s.provider.id,
      name: s.provider.name,
      kind: s.provider.kind,
      ok: !s.error,
      count: s.offers.length,
      error: s.error,
    })),
  };
}

const etaOrInf = (o: OfferDTO) => o.deliveryEtaDays ?? Number.POSITIVE_INFINITY;
const landed = (o: OfferDTO) => o.price + (o.deliveryCharge ?? 0);

export function sortOffers(offers: OfferDTO[], sort: SortKey): OfferDTO[] {
  const inStockFirst = (a: OfferDTO, b: OfferDTO) => Number(a.availability === "OUT_OF_STOCK") - Number(b.availability === "OUT_OF_STOCK");
  const cmp: Record<SortKey, (a: OfferDTO, b: OfferDTO) => number> = {
    lowest_price: (a, b) => landed(a) - landed(b),
    highest_discount: (a, b) => b.discountPercent - a.discountPercent || a.price - b.price,
    fastest_delivery: (a, b) => etaOrInf(a) - etaOrInf(b) || a.price - b.price,
    highest_rating: (a, b) => (b.sellerRating ?? 0) - (a.sellerRating ?? 0) || (b.ratingCount ?? 0) - (a.ratingCount ?? 0),
    newest: (a, b) => (b.releasedAt ?? b.fetchedAt).localeCompare(a.releasedAt ?? a.fetchedAt) || a.price - b.price,
  };
  return [...offers].sort((a, b) => inStockFirst(a, b) || cmp[sort](a, b));
}

/**
 * Main search entry point used by `/api/search`.
 * Results are cached per normalised query (Redis) – sorting/filtering happens after the cache.
 */
export async function searchPrices(rawQuery: string, sort: SortKey, userId?: string): Promise<SearchResponse> {
  const started = Date.now();
  const query = rawQuery.trim().slice(0, 120);
  const normalized = normalizeQuery(query);
  const providerIds = getActiveProviders().map((p) => p.id).join(",");
  const { value, hit } = await cached(`search:v2:${providerIds}:${normalized}`, env.SEARCH_CACHE_TTL, () => aggregate(query));

  const tookMs = Date.now() - started;
  db.searchHistory
    .create({ data: { userId, query, normalized, resultCount: value.offers.length, durationMs: tookMs } })
    .catch((err) => logger.warn("search", "Failed to record search history", { error: (err as Error).message }));

  if (!hit && value.productIds.length) {
    checkAlertsForProducts(value.productIds).catch((err) =>
      logger.warn("alerts", "Inline alert check failed", { error: (err as Error).message }),
    );
  }

  return {
    query,
    sort,
    results: sortOffers(value.offers, sort),
    productCount: value.productIds.length,
    providers: value.providers,
    isDemo: isDemoMode(),
    cached: hit,
    tookMs,
  };
}
