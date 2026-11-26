import type { ProviderOffer } from "../providers/types";

/**
 * Cross-retailer product matching. Retailers title the same item differently
 * ("Apple iPhone 16 (128 GB) - Black" vs "iPhone 16 128GB Black"), so we compare
 * normalised token sets with Jaccard similarity and merge sufficiently similar offers.
 */
const NOISE = new Set([
  "the", "with", "and", "for", "of", "in", "new", "latest", "edition", "pack", "combo", "free", "india", "official",
  "black", "white", "blue", "red", "green", "grey", "gray", "silver", "gold", "pink", "purple", "titanium", "colour", "color",
]);

export function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/(\d+)\s*(gb|tb|mm|ml|kg|g|l|inch|in|w|mah|hz)\b/g, "$1$2")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !NOISE.has(t));
}

export function matchKeyFor(offer: Pick<ProviderOffer, "title" | "brand" | "matchKey">): string {
  if (offer.matchKey) return offer.matchKey;
  const toks = titleTokens(offer.title);
  const brand = offer.brand?.toLowerCase().replace(/[^a-z0-9]/g, "");
  const head = toks.slice(0, 7);
  if (brand && !head.includes(brand)) head.unshift(brand);
  return head.sort().join("-");
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter || 1);
}

export interface OfferGroup {
  matchKey: string;
  offers: ProviderOffer[];
}

/** Groups offers into products; keeps at most one (cheapest) offer per retailer per product. */
export function groupOffers(offers: ProviderOffer[], threshold = 0.55): OfferGroup[] {
  const groups: (OfferGroup & { tokens: Set<string> })[] = [];
  for (const offer of offers) {
    const key = matchKeyFor(offer);
    const tokens = new Set(titleTokens(offer.title));
    let group = groups.find((g) => g.matchKey === key);
    if (!group && !offer.matchKey) {
      group = groups.find((g) => !g.matchKey.startsWith("mock:") && jaccard(g.tokens, tokens) >= threshold);
    }
    if (!group) {
      group = { matchKey: key, offers: [], tokens };
      groups.push(group);
    }
    const existing = group.offers.findIndex((o) => o.retailer === offer.retailer);
    if (existing === -1) group.offers.push(offer);
    else if (offer.price < group.offers[existing].price) group.offers[existing] = offer;
  }
  return groups.map(({ matchKey, offers }) => ({ matchKey, offers }));
}
