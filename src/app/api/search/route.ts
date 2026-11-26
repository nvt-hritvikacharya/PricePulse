import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/features/auth/server/session";
import { searchPrices } from "@/server/pricing/search-service";

const schema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters").max(120),
  sort: z.enum(["lowest_price", "highest_discount", "fastest_delivery", "highest_rating", "newest"]).default("lowest_price"),
});

/** GET /api/search?q=iphone&sort=lowest_price – cross-retailer price comparison. */
export const GET = handler(async (req: Request) => {
  const user = await requireUser();
  const params = schema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const limit = await rateLimit(`search:${user.id}:${clientIp(req.headers)}`, 30, 60);
  if (!limit.ok) throw new HttpError(429, `Slow down! Try again in ${limit.resetSeconds}s.`, "rate_limited");
  const daily = await rateLimit(`search-day:${user.id}`, 500, 86_400);
  if (!daily.ok) throw new HttpError(429, "Daily search limit reached. Try again tomorrow.", "rate_limited");
  const data = await searchPrices(params.q, params.sort, user.id);
  return json(data, { headers: { "X-RateLimit-Remaining": String(limit.remaining) } });
});
