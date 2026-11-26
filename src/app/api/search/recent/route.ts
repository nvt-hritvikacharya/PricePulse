import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { requireUser } from "@/features/auth/server/session";

/** Recent distinct searches of the current user. */
export const GET = handler(async () => {
  const user = await requireUser();
  const rows = await db.searchHistory.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { query: true, normalized: true, createdAt: true },
  });
  const seen = new Set<string>();
  const recent = rows.filter((r) => !seen.has(r.normalized) && seen.add(r.normalized)).slice(0, 10);
  return json({ recent: recent.map((r) => ({ query: r.query, at: r.createdAt })) });
});

export const DELETE = handler(async () => {
  const user = await requireUser();
  await db.searchHistory.updateMany({ where: { userId: user.id }, data: { userId: null } });
  return json({ ok: true });
});
