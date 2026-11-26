import { handler, HttpError, json } from "@/lib/api";
import { requireUser } from "@/features/auth/server/session";
import { getPriceHistory, getProduct } from "@/server/pricing/product-service";
import { getRecommendation } from "@/server/ai/recommendation";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const product = await getProduct(id);
  if (!product) throw new HttpError(404, "Product not found", "not_found");
  const history = await getPriceHistory(product.id, 90);
  return json(await getRecommendation(product, history));
});
