/**
 * Deploy step: fetch real photos for catalogue products that still show generated artwork.
 * Skips quietly when no SerpApi key is set. Each product is looked up at most once per 30 days,
 * within the monthly budget (IMAGE_LOOKUPS_PER_MONTH, default 200 of SerpApi's free 250).
 */
import { PrismaClient } from "@prisma/client";
import { imageLookupsThisMonth, imageSearchKey, monthlyImageBudget, resolveProductImage } from "../src/server/images/serpapi-images";

const db = new PrismaClient();
// SerpApi's free plan allows 50 searches per hour.
const MAX_PER_RUN = 40;

async function main() {
  if (!imageSearchKey()) {
    console.log("warm-images: no SERPAPI_IMAGES_API_KEY / SERPAPI_API_KEY, skipping");
    return;
  }
  const products = await db.product.findMany({
    where: { OR: [{ imageUrl: null }, { imageUrl: { startsWith: "/api/img/" } }] },
    orderBy: [{ viewCount: "desc" }, { createdAt: "asc" }],
    select: { id: true, name: true, imageUrl: true },
    take: MAX_PER_RUN,
  });
  let saved = 0;
  for (const p of products) {
    if ((await imageLookupsThisMonth(db)) >= monthlyImageBudget()) break;
    if (await resolveProductImage(db, p)) saved++;
  }
  console.log(`warm-images: saved ${saved} photo(s); ${await imageLookupsThisMonth(db)} lookup(s) used this month`);
}

main()
  .catch((err) => {
    // Photos are optional: never fail the deploy over them.
    console.warn("warm-images: skipped after error:", (err as Error).message);
  })
  .finally(() => db.$disconnect());
