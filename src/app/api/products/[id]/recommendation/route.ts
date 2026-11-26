import { handler, HttpError, json } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/features/auth/server/session";
import { getPriceHistory, getProduct } from "@/server/pricing/product-service";
import { getRecommendation } from "@/server/ai/recommendation";

export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const limit = await rateLimit(`reco:${user.id}:${clientIp(req.headers)}`, 20, 60);
  if (!limit.ok) throw new HttpError(429, `Slow down! Try again in ${limit.resetSeconds}s.`, "rate_limited");
  const { id } = await ctx.params;
  const product = await getProduct(id);
  if (!product) throw new HttpError(404, "Product not found", "not_found");
  const history = await getPriceHistory(product.id, 90);
  return json(await getRecommendation(product, history));
});
