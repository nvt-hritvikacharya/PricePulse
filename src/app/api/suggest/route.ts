import { handler, json } from "@/lib/api";
import { db } from "@/lib/db";
import { cached } from "@/lib/redis";
import { normalizeQuery } from "@/lib/utils";
import { requireUser } from "@/features/auth/server/session";
import type { SuggestionDTO } from "@/features/search/types";
import { searchCatalog } from "@/server/providers/mock/pricing";
import { isDemoMode } from "@/server/providers/registry";

/** Autocomplete: known products, popular past queries and (demo mode) catalogue matches. */
export const GET = handler(async (req: Request) => {
  await requireUser();
  const q = normalizeQuery(new URL(req.url).searchParams.get("q") ?? "").slice(0, 60);
  if (q.length < 2) return json({ suggestions: [] as SuggestionDTO[] });

  const { value } = await cached(`suggest:v1:${q}`, 120, async () => {
    const [products, queries] = await Promise.all([
      db.product.findMany({
        where: { OR: [{ name: { contains: q, mode: "insensitive" } }, { brand: { startsWith: q, mode: "insensitive" } }] },
        orderBy: [{ viewCount: "desc" }, { compareCount: "desc" }],
        take: 5,
        select: { id: true, slug: true, name: true },
      }),
      db.searchHistory.groupBy({
        by: ["normalized"],
        where: { normalized: { startsWith: q } },
        _count: { normalized: true },
        orderBy: { _count: { normalized: "desc" } },
        take: 4,
      }),
    ]);
    const out: SuggestionDTO[] = [
      ...queries.map((r) => ({ type: "query" as const, label: r.normalized })),
      ...products.map((p) => ({ type: "product" as const, label: p.name, productId: p.id, slug: p.slug })),
    ];
    if (isDemoMode() && out.length < 6) {
      for (const p of searchCatalog(q, 6)) {
        if (!out.some((s) => s.label === p.name)) out.push({ type: "query", label: p.name });
      }
    }
    return out.slice(0, 8);
  });
  return json({ suggestions: value });
});
