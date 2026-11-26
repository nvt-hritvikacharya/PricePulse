/** Pure helper (shared with the seed script): synthesises a reviews summary from offer ratings. */
import { MOCK_CATALOG } from "../providers/mock/catalog";

export function buildReviewSummary(matchKey: string, offers: { sellerRating?: number | null; ratingCount?: number | null }[]) {
  const rated = offers.filter((o) => o.sellerRating);
  const weight = rated.reduce((s, o) => s + (o.ratingCount ?? 1), 0);
  const avg = rated.length ? rated.reduce((s, o) => s + (o.sellerRating ?? 0) * (o.ratingCount ?? 1), 0) / weight : null;
  const mock = matchKey.startsWith("mock:") ? MOCK_CATALOG.find((p) => `mock:${p.key}` === matchKey) : undefined;
  const a = avg ?? 4.2;
  const five = Math.round(Math.min(80, Math.max(30, (a - 3) * 45)));
  const four = Math.round((100 - five) * 0.6);
  const three = Math.round((100 - five - four) * 0.55);
  const two = Math.round((100 - five - four - three) * 0.5);
  return {
    averageRating: avg ? Math.round(avg * 10) / 10 : null,
    totalRatings: rated.reduce((s, o) => s + (o.ratingCount ?? 0), 0),
    distribution: { 5: five, 4: four, 3: three, 2: two, 1: Math.max(0, 100 - five - four - three - two) },
    pros: mock?.pros ?? [],
    cons: mock?.cons ?? [],
  };
}
