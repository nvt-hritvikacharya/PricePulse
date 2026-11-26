import { handler, json } from "@/lib/api";
import { requireUser } from "@/features/auth/server/session";
import { getPriceHistory } from "@/server/pricing/product-service";

/** GET /api/products/:id/history?days=30|90 */
export const GET = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireUser();
  const { id } = await ctx.params;
  const days = new URL(req.url).searchParams.get("days") === "90" ? 90 : 30;
  return json(await getPriceHistory(id, days));
});
