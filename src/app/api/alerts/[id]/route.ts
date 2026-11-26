import { z } from "zod";
import { handler, HttpError, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

const patchSchema = z.object({
  active: z.boolean().optional(),
  targetPrice: z.coerce.number().positive().optional(),
  notifyEmail: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
});

async function own(id: string, userId: string) {
  const alert = await db.priceAlert.findUnique({ where: { id } });
  if (!alert || alert.userId !== userId) throw new HttpError(404, "Alert not found", "not_found");
  return alert;
}

export const PATCH = handler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await own(id, user.id);
  const data = patchSchema.parse(await req.json());
  await db.priceAlert.update({ where: { id }, data: { ...data, ...(data.targetPrice ? { lastNotifiedAt: null, triggeredPrice: null } : {}) } });
  return json({ ok: true });
});

export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  await own(id, user.id);
  await db.priceAlert.delete({ where: { id } });
  return json({ ok: true });
});
