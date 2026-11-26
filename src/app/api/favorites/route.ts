import { z } from "zod";
import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";
import { productCardInclude, toProductCard } from "@/server/pricing/product-service";

const body = z.object({ productId: z.string().min(1) });

export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await db.favoriteProduct.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { include: productCardInclude } },
  });
  return json({ items: rows.map((r) => ({ id: r.id, addedAt: r.createdAt, product: toProductCard(r.product) })) });
});

/** Adds the product (idempotent). */
export const POST = handler(async (req: Request) => {
  const user = await requireUser();
  const { productId } = body.parse(await req.json());
  await db.favoriteProduct.upsert({
    where: { userId_productId: { userId: user.id, productId } },
    create: { userId: user.id, productId },
    update: {},
  });
  return json({ ok: true, saved: true });
});

export const DELETE = handler(async (req: Request) => {
  const user = await requireUser();
  const productId = new URL(req.url).searchParams.get("productId") ?? "";
  await db.favoriteProduct.deleteMany({ where: { userId: user.id, productId } });
  return json({ ok: true, saved: false });
});
