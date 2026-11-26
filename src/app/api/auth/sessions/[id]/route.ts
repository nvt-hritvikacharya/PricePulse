import { handler, HttpError, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

/** Signs out one of the current user's other sessions. */
export const DELETE = handler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await requireUser();
  const { id } = await ctx.params;
  if (id === user.sessionId) throw new HttpError(400, "Use Logout to end this session", "current_session");
  const res = await db.session.updateMany({ where: { id, userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (res.count === 0) throw new HttpError(404, "Session not found", "not_found");
  return json({ ok: true });
});
