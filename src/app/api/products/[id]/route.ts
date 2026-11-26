import { handler, HttpError, json } from "@/lib/api";
import { requireUser } from "@/features/auth/server/session";
import { getProduct, getRelatedProducts } from "@/server/pricing/product-service";

export const GET = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const product = await getProduct(id);
  if (!product) throw new HttpError(404, "Product not found", "not_found");
  const related = await getRelatedProducts(product.id, product.category, product.brand);
  return json({ product, related });
});
