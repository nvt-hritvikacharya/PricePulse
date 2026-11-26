import "server-only";
import { db } from "@/lib/db";

const DAY = 86_400_000;

function lastNDays(n: number) {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * DAY).toISOString().slice(0, 10));
}

/** Buckets rows by ISO day for the last `n` days. */
function bucket(rows: { createdAt: Date }[], n: number) {
  const days = lastNDays(n);
  const map = new Map(days.map((d) => [d, 0]));
  for (const r of rows) {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (map.has(d)) map.set(d, (map.get(d) ?? 0) + 1);
  }
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

export async function getOverview() {
  const since = new Date(Date.now() - DAY);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [users, newUsers, activeUsers, searches24h, products, offers, alerts, triggered, errors, searchRows, signupRows] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.user.count({ where: { lastActiveAt: { gte: since } } }),
    db.searchHistory.count({ where: { createdAt: { gte: since } } }),
    db.product.count(),
    db.offer.count(),
    db.priceAlert.count({ where: { active: true } }),
    db.priceAlert.count({ where: { lastNotifiedAt: { not: null } } }),
    db.appLog.count({ where: { level: "ERROR", createdAt: { gte: since } } }),
    db.searchHistory.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
    db.user.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
  ]);
  return {
    kpis: { users, newUsers, activeUsers, searches24h, products, offers, alerts, triggered, errors },
    searchesByDay: bucket(searchRows, 30),
    signupsByDay: bucket(signupRows, 30),
  };
}

export async function getUserAnalytics() {
  const since30 = new Date(Date.now() - 30 * DAY);
  const [byMethod, byRole, recent, activeRows, topUsers] = await Promise.all([
    db.user.groupBy({ by: ["authMethod"], _count: { _all: true } }),
    db.user.groupBy({ by: ["role"], _count: { _all: true } }),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, name: true, email: true, phone: true, role: true, authMethod: true, createdAt: true, lastActiveAt: true, _count: { select: { searchHistory: true, priceAlerts: true } } },
    }),
    db.session.findMany({ where: { lastActiveAt: { gte: since30 } }, select: { lastActiveAt: true, userId: true } }),
    db.searchHistory.groupBy({ by: ["userId"], where: { userId: { not: null } }, _count: { _all: true }, orderBy: { _count: { userId: "desc" } }, take: 5 }),
  ]);
  const days = lastNDays(30);
  const dau = days.map((date) => ({
    date,
    count: new Set(activeRows.filter((r) => r.lastActiveAt.toISOString().slice(0, 10) === date).map((r) => r.userId)).size,
  }));
  return {
    byMethod: byMethod.map((m) => ({ name: m.authMethod, value: m._count._all })),
    byRole: byRole.map((r) => ({ name: r.role, value: r._count._all })),
    recent,
    dau,
    topUserIds: topUsers.map((t) => ({ userId: t.userId, searches: t._count._all })),
  };
}

export async function getSearchAnalytics() {
  const since7 = new Date(Date.now() - 7 * DAY);
  const since30 = new Date(Date.now() - 30 * DAY);
  const [top, zero, latency, recent, rows] = await Promise.all([
    db.searchHistory.groupBy({ by: ["normalized"], where: { createdAt: { gte: since30 } }, _count: { _all: true }, orderBy: { _count: { normalized: "desc" } }, take: 15 }),
    db.searchHistory.groupBy({ by: ["normalized"], where: { resultCount: 0, createdAt: { gte: since30 } }, _count: { _all: true }, orderBy: { _count: { normalized: "desc" } }, take: 10 }),
    db.searchHistory.aggregate({ where: { createdAt: { gte: since7 } }, _avg: { durationMs: true, resultCount: true }, _count: { _all: true } }),
    db.searchHistory.findMany({ orderBy: { createdAt: "desc" }, take: 20, include: { user: { select: { name: true, email: true } } } }),
    db.searchHistory.findMany({ where: { createdAt: { gte: since30 } }, select: { createdAt: true } }),
  ]);
  return {
    top: top.map((t) => ({ query: t.normalized, count: t._count._all })),
    zero: zero.map((t) => ({ query: t.normalized, count: t._count._all })),
    avgLatencyMs: Math.round(latency._avg.durationMs ?? 0),
    avgResults: Math.round(latency._avg.resultCount ?? 0),
    total7d: latency._count._all,
    recent,
    byDay: bucket(rows, 30),
  };
}

export async function getProductAnalytics() {
  const include = { offers: { orderBy: { price: "asc" as const }, take: 1 }, _count: { select: { alerts: true, wishlist: true } } };
  const [popular, compared, watched] = await Promise.all([
    db.product.findMany({ orderBy: { viewCount: "desc" }, take: 10, include }),
    db.product.findMany({ orderBy: { compareCount: "desc" }, take: 10, include }),
    db.product.findMany({ orderBy: { alerts: { _count: "desc" } }, take: 10, include }),
  ]);
  return { popular, compared, watched };
}

export async function getProviderCallStats() {
  const since = new Date(Date.now() - DAY);
  const [grouped, recent] = await Promise.all([
    db.providerCall.groupBy({ by: ["providerId", "ok"], where: { createdAt: { gte: since } }, _count: { _all: true }, _avg: { latencyMs: true } }),
    db.providerCall.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  return { grouped, recent };
}

export async function getLogs(level?: string, take = 100) {
  return db.appLog.findMany({
    where: level && ["DEBUG", "INFO", "WARN", "ERROR"].includes(level) ? { level: level as "INFO" } : undefined,
    orderBy: { createdAt: "desc" },
    take,
  });
}
