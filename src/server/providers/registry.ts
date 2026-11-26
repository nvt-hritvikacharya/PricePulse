import "server-only";
import { env } from "@/lib/env";
import type { PriceProvider } from "./types";
import { amazonPaapiProvider } from "./adapters/amazon-paapi";
import { flipkartAffiliateProvider } from "./adapters/flipkart-affiliate";
import { serpapiShoppingProvider } from "./adapters/serpapi-shopping";
import { mockProvider } from "./adapters/mock";

/** All known providers. Register new adapters here. */
export const ALL_PROVIDERS: PriceProvider[] = [amazonPaapiProvider, flipkartAffiliateProvider, serpapiShoppingProvider, mockProvider];

const realProviders = () => ALL_PROVIDERS.filter((p) => p.kind !== "mock");

/** True when no real provider has credentials, i.e. results are demo data only. */
export function isDemoMode(): boolean {
  if (env.MOCK_PROVIDER === "never") return false;
  if (env.MOCK_PROVIDER === "always") return true;
  return !realProviders().some((p) => p.isConfigured());
}

/** Providers that should be queried for a search, honouring MOCK_PROVIDER. */
export function getActiveProviders(): PriceProvider[] {
  const real = realProviders().filter((p) => p.isConfigured());
  const useMock = env.MOCK_PROVIDER === "always" || (env.MOCK_PROVIDER === "auto" && real.length === 0);
  return useMock ? [...real, mockProvider] : real;
}

export function describeProviders() {
  const active = new Set(getActiveProviders().map((p) => p.id));
  return ALL_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    kind: p.kind,
    retailers: p.retailers,
    configured: p.isConfigured(),
    active: active.has(p.id),
    requiredEnv: p.requiredEnv,
    rateLimitPerMinute: p.rateLimitPerMinute,
  }));
}
