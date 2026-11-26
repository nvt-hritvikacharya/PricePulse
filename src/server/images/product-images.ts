import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { kv } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { retailerSearchQuery } from "@/features/retailers/retailers";
import { isPlaceholderImage, parseGoogleCse, parseSerpApiImages, pickImage, type ImageCandidate } from "./image-search";

/**
 * Real product photos for catalogue items that only have generated artwork.
 * Sources, in order: Google Programmable Search image search (GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID),
 * then SerpApi Google Images (SERPAPI_API_KEY). Results are cached and saved on the product row,
 * so each product is looked up once.
 */
const FOUND_TTL = 30 * 86_400;
const MISS_TTL = 86_400;

export const isImageSearchConfigured = () => Boolean((env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_ID) || env.SERPAPI_API_KEY);

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function googleCandidates(q: string): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({ key: env.GOOGLE_CSE_API_KEY!, cx: env.GOOGLE_CSE_ID!, q, searchType: "image", num: "8", safe: "active", gl: "in" });
  return parseGoogleCse(await getJson(`https://www.googleapis.com/customsearch/v1?${params}`));
}

async function serpApiCandidates(q: string): Promise<ImageCandidate[]> {
  const params = new URLSearchParams({ engine: "google_images", q, gl: "in", hl: "en", safe: "active", api_key: env.SERPAPI_API_KEY! });
  return parseSerpApiImages(await getJson(`https://serpapi.com/search.json?${params}`));
}

export async function findProductImage(productName: string): Promise<string | null> {
  if (!isImageSearchConfigured()) return null;
  const q = retailerSearchQuery(productName);
  const cacheKey = `img:v1:${q.toLowerCase()}`;
  const hit = await kv.get(cacheKey);
  if (hit !== null) return hit || null;

  const sources: [string, (q: string) => Promise<ImageCandidate[]>][] = [];
  if (env.GOOGLE_CSE_API_KEY && env.GOOGLE_CSE_ID) sources.push(["google_cse", googleCandidates]);
  if (env.SERPAPI_API_KEY) sources.push(["serpapi_images", serpApiCandidates]);

  let found: string | null = null;
  for (const [name, fetchCandidates] of sources) {
    try {
      found = pickImage(await fetchCandidates(q));
      if (found) break;
    } catch (err) {
      logger.warn("images", "Image search failed", { source: name, error: (err as Error).message });
    }
  }
  await kv.set(cacheKey, found ?? "", found ? FOUND_TTL : MISS_TTL);
  return found;
}

/**
 * Looks up photos for up to `limit` products that still show generated artwork and saves them.
 * Bounded by `timeoutMs` so a slow image API never holds up search results.
 */
export async function ensureProductImages(
  products: { id: string; name: string; imageUrl: string | null }[],
  { limit = 8, timeoutMs = 3500 } = {},
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (!isImageSearchConfigured()) return found;
  const todo = products.filter((p) => isPlaceholderImage(p.imageUrl)).slice(0, limit);
  const work = Promise.allSettled(
    todo.map(async (p) => {
      const url = await findProductImage(p.name);
      if (!url) return;
      found.set(p.id, url);
      await db.product.updateMany({ where: { id: p.id, OR: [{ imageUrl: null }, { imageUrl: { startsWith: "/api/img/" } }] }, data: { imageUrl: url } });
    }),
  );
  await Promise.race([work, new Promise((r) => setTimeout(r, timeoutMs))]);
  return found;
}
