import "server-only";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { isPlaceholderImage } from "./image-search";
import { imageSearchKey, resolveProductImage } from "./serpapi-images";

/**
 * Real product photos for items that only have generated artwork, via SerpApi Google Images
 * (SERPAPI_IMAGES_API_KEY, or SERPAPI_API_KEY). The deploy step pre-fetches the whole catalogue;
 * this covers products added later. Each product is looked up once and the photo is saved on it.
 */
export const isImageSearchConfigured = () => Boolean(imageSearchKey());

/**
 * Looks up photos for up to `limit` products still showing generated artwork.
 * Bounded by `timeoutMs` so a slow image API never holds up search results.
 */
export async function ensureProductImages(
  products: { id: string; name: string; imageUrl: string | null }[],
  { limit = 4, timeoutMs = 3500 } = {},
): Promise<Map<string, string>> {
  const found = new Map<string, string>();
  if (!isImageSearchConfigured()) return found;
  const todo = products.filter((p) => isPlaceholderImage(p.imageUrl)).slice(0, limit);
  const work = Promise.allSettled(
    todo.map(async (p) => {
      const url = await resolveProductImage(db, p);
      if (url) found.set(p.id, url);
    }),
  ).then((results) => {
    for (const r of results) if (r.status === "rejected") logger.warn("images", "Image lookup failed", { error: String(r.reason).slice(0, 200) });
  });
  await Promise.race([work, new Promise((r) => setTimeout(r, timeoutMs))]);
  return found;
}
