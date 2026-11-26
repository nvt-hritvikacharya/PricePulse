import type { RetailerId } from "@/features/retailers/retailers";

export type AvailabilityStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNKNOWN";

/** A single price offer returned by a provider, normalised to a common shape. */
export interface ProviderOffer {
  providerId: string;
  retailer: RetailerId;
  externalId?: string;
  title: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  url: string;
  price: number;
  mrp?: number;
  deliveryCharge?: number;
  /** Fractional days (0.007 ≈ 10 minutes for quick-commerce). */
  deliveryEtaDays?: number;
  sellerName?: string;
  sellerRating?: number;
  ratingCount?: number;
  availability: AvailabilityStatus;
  /** Extra data a provider can supply for the canonical product (specs, description...). */
  specs?: Record<string, string>;
  description?: string;
  /** Release date if known (powers the "newest" sort). */
  releasedAt?: string;
  /** Provider-supplied hint for cross-retailer product matching (e.g. a model number). */
  matchKey?: string;
  isMock?: boolean;
}

export interface ProviderSearchOptions {
  limit: number;
  signal: AbortSignal;
}

export type ProviderKind = "official-api" | "aggregator" | "mock";

/**
 * Contract every price source implements. Adding a new source = implement this interface
 * and register it in `registry.ts`. Resilience (rate limiting, caching, retries, timeouts,
 * health tracking, circuit breaking) is applied uniformly by `resilient.ts`.
 */
export interface PriceProvider {
  id: string;
  name: string;
  kind: ProviderKind;
  /** Retailers this provider can return offers for. */
  retailers: readonly RetailerId[];
  /** Max outbound requests per minute (provider quota). */
  rateLimitPerMinute: number;
  /** Whether required credentials are configured. */
  isConfigured(): boolean;
  /** Human-readable list of env vars needed to enable this provider. */
  requiredEnv: readonly string[];
  search(query: string, opts: ProviderSearchOptions): Promise<ProviderOffer[]>;
}

/** Error carrying an HTTP status so the retry policy can decide whether to retry. */
export class ProviderError extends Error {
  constructor(message: string, public status?: number, public retryable = true) {
    super(message);
  }
}
