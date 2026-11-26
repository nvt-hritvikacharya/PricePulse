/**
 * Product photos from Google Images via SerpApi (free plan: 250 searches/month).
 * No `server-only` import: the deploy-time warm-up script uses this module too.
 *
 * Every lookup is recorded in `provider_calls` (providerId "serpapi_images", operation
 * "image:<productId>"), which enforces a monthly budget across all instances and keeps
 * a product from being searched again for 30 days after a search found nothing usable.
 * Errored calls (bad key, outage) count toward neither, so they are retried.
 */
import type { PrismaClient } from "@prisma/client";
import { retailerSearchQuery } from "../../features/retailers/retailers";
import { isPlaceholderImage, parseSerpApiImages, pickImage } from "./image-search";

export const IMAGE_PROVIDER_ID = "serpapi_images";
const RETRY_AFTER_MISS_MS = 30 * 86_400_000;
// After an error (bad key, outage) all lookups pause briefly instead of failing on every search.
const ERROR_PAUSE_MS = 10 * 60_000;

export function imageSearchKey(env: Record<string, string | undefined> = process.env): string | undefined {
  return env.SERPAPI_IMAGES_API_KEY?.trim() || env.SERPAPI_API_KEY?.trim() || undefined;
}

export function monthlyImageBudget(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.IMAGE_LOOKUPS_PER_MONTH);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 200;
}

const monthStart = (now = new Date()) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

export async function imageLookupsThisMonth(db: PrismaClient): Promise<number> {
  // SerpApi bills only successful searches; errored calls don't use the free allowance.
  return db.providerCall.count({ where: { providerId: IMAGE_PROVIDER_ID, ok: true, createdAt: { gte: monthStart() } } });
}

async function fetchCandidates(apiKey: string, query: string) {
  const params = new URLSearchParams({ engine: "google_images", q: query, gl: "in", hl: "en", safe: "active", api_key: apiKey });
  const res = await fetch(`https://serpapi.com/search.json?${params}`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw Object.assign(new Error(`SerpApi responded ${res.status}`), { status: res.status });
  return parseSerpApiImages(await res.json());
}

/**
 * Looks up and saves a photo for one product that still shows generated artwork.
 * Returns the saved URL, or null when skipped (budget, recent miss) or nothing suitable was found.
 */
export async function resolveProductImage(
  db: PrismaClient,
  product: { id: string; name: string; imageUrl: string | null },
  { apiKey = imageSearchKey(), budget = monthlyImageBudget() }: { apiKey?: string; budget?: number } = {},
): Promise<string | null> {
  if (!apiKey || !isPlaceholderImage(product.imageUrl)) return null;
  const operation = `image:${product.id}`;
  const recent = await db.providerCall.findFirst({
    where: { providerId: IMAGE_PROVIDER_ID, operation, ok: true, createdAt: { gte: new Date(Date.now() - RETRY_AFTER_MISS_MS) } },
    select: { id: true },
  });
  if (recent) return null;
  const lastError = await db.providerCall.findFirst({
    where: { providerId: IMAGE_PROVIDER_ID, ok: false, createdAt: { gte: new Date(Date.now() - ERROR_PAUSE_MS) } },
    select: { id: true },
  });
  if (lastError) return null;
  if ((await imageLookupsThisMonth(db)) >= budget) return null;

  const started = Date.now();
  let url: string | null = null;
  let error: string | undefined;
  let statusCode: number | undefined;
  try {
    url = pickImage(await fetchCandidates(apiKey, retailerSearchQuery(product.name)));
  } catch (err) {
    error = (err as Error).message.slice(0, 200);
    statusCode = (err as { status?: number }).status;
  }
  await db.providerCall.create({
    data: { providerId: IMAGE_PROVIDER_ID, operation, ok: !error, latencyMs: Date.now() - started, statusCode, error },
  });
  if (!url) return null;
  await db.product.updateMany({
    where: { id: product.id, OR: [{ imageUrl: null }, { imageUrl: { startsWith: "/api/img/" } }] },
    data: { imageUrl: url },
  });
  return url;
}
