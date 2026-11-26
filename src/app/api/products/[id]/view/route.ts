import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

/** Records a product view (recently viewed + analytics). */
export const POST = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await db.$transaction([
    db.product.update({ where: { id }, data: { viewCount: { increment: 1 } } }),
    db.recentlyViewed.upsert({
      where: { userId_productId: { userId: user.id, productId: id } },
      create: { userId: user.id, productId: id },
      update: { viewedAt: new Date() },
    }),
  ]);
  return json({ ok: true });
});
