/**
 * Deterministic pseudo-market for the mock provider. Same inputs always yield the same price,
 * so today's offer and the generated 90-day history are consistent with each other.
 * Pure functions only (shared with `prisma/seed.ts`).
 */
import type { RetailerId } from "@/features/retailers/retailers";
import { CATEGORY_RETAILERS, MOCK_CATALOG, RETAILER_LOGISTICS, type MockCategory, type MockProduct } from "./catalog";

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded float in [0, 1). */
export function rand(seed: string): number {
  return (hash(seed) % 100000) / 100000;
}

const DAY = 86_400_000;
export const dayIndex = (d: Date = new Date()) => Math.floor(d.getTime() / DAY);

/** Indian retail-style rounding: ₹x99 / ₹x49 endings for big tickets, ₹x9 for small. */
function retailRound(n: number): number {
  if (n >= 10000) return Math.round(n / 100) * 100 - 1;
  if (n >= 1000) return Math.round(n / 50) * 50 - 1;
  return Math.max(9, Math.round(n / 5) * 5 - 1);
}

/** Retailers carrying a product: a stable subset of its category's retailers (min 3). */
export function retailersFor(product: Pick<MockProduct, "key" | "category">): RetailerId[] {
  const all = CATEGORY_RETAILERS[product.category];
  const kept = all.filter((r, i) => i < 2 || rand(`${product.key}:${r}:carry`) > 0.3);
  return kept.length >= 3 ? kept : all.slice(0, 3);
}

/** Price of `product` at `retailer` on a given day. */
export function priceOn(product: Pick<MockProduct, "key" | "basePrice">, retailer: RetailerId, day: number): number {
  const s = `${product.key}:${retailer}`;
  const retailerBias = 0.95 + rand(`${s}:bias`) * 0.08; // -5%..+3% around base
  const phase = rand(`${s}:phase`) * Math.PI * 2;
  const wave = 0.022 * Math.sin(day / 9 + phase) + 0.01 * Math.sin(day / 2.7 + phase * 1.7);
  // Periodic sale events (≈ every 3–5 weeks, lasting ~4 days).
  const period = 23 + Math.floor(rand(`${s}:period`) * 14);
  const inSale = (day + Math.floor(rand(`${s}:offset`) * period)) % period < 4;
  const sale = inSale ? -(0.04 + rand(`${s}:${Math.floor(day / period)}:depth`) * 0.06) : 0;
  return retailRound(product.basePrice * retailerBias * (1 + wave + sale));
}

export function mrpFor(product: Pick<MockProduct, "key" | "basePrice">): number {
  return retailRound(product.basePrice * (1.06 + rand(`${product.key}:mrp`) * 0.16));
}

export interface MockOfferData {
  retailer: RetailerId;
  price: number;
  mrp: number;
  deliveryCharge: number;
  deliveryEtaDays: number;
  sellerRating: number;
  ratingCount: number;
  availability: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";
  sellerName: string;
}

export function offerFor(product: MockProduct, retailer: RetailerId, day = dayIndex()): MockOfferData {
  const s = `${product.key}:${retailer}`;
  const log = RETAILER_LOGISTICS[retailer];
  const price = priceOn(product, retailer, day);
  const eta = log.eta[0] + rand(`${s}:eta`) * (log.eta[1] - log.eta[0]);
  const stockRoll = rand(`${s}:stock:${day}`);
  return {
    retailer,
    price,
    mrp: mrpFor(product),
    deliveryCharge: price >= log.freeAbove ? 0 : log.fee,
    deliveryEtaDays: Math.round(eta * 1000) / 1000,
    sellerRating: Math.round((log.rating[0] + rand(`${s}:rating`) * (log.rating[1] - log.rating[0])) * 10) / 10,
    ratingCount: 200 + Math.floor(rand(`${s}:count`) * 48000),
    availability: stockRoll < 0.06 ? "OUT_OF_STOCK" : stockRoll < 0.18 ? "LOW_STOCK" : "IN_STOCK",
    sellerName: retailer === "amazon" ? "Appario Retail" : retailer === "flipkart" ? "RetailNet" : "Sold by retailer",
  };
}

/** Category synonyms treated like tags during matching. */
const CATEGORY_TERMS: Record<string, string[]> = {
  Mobiles: ["mobile", "mobiles", "phone", "phones", "smartphone", "smartphones"],
  Laptops: ["laptop", "laptops", "notebook"],
  Audio: ["audio", "headphone", "headphones", "earphones", "earbuds", "speaker"],
  TVs: ["tv", "tvs", "television", "smart"],
  Wearables: ["watch", "smartwatch", "wearable"],
  Appliances: ["appliance", "appliances", "home", "kitchen"],
  Fashion: ["clothing", "fashion", "apparel"],
  Footwear: ["shoes", "shoe", "footwear", "sneakers"],
  Beauty: ["beauty", "makeup", "skincare", "cosmetics"],
  Grocery: ["grocery", "groceries", "food", "staples"],
};

const STOP = new Set(["the", "for", "with", "and", "in", "of", "a", "best", "buy", "price", "online", "india"]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t && !STOP.has(t));
}

/**
 * Relevance scoring over the demo catalogue. A product must match most of the query's
 * tokens (numeric tokens like "16" only count alongside a word match) and score close to the
 * best hit, so "iphone 16" doesn't drag in a laptop with 16 GB RAM.
 */
export function searchCatalog(query: string, limit = 12): MockProduct[] {
  const q = tokens(query);
  if (!q.length) return [];
  const words = q.filter((t) => !/^\d+$/.test(t));
  const scored = MOCK_CATALOG.map((p) => {
    const brand = tokens(p.brand);
    const tags = [...p.tags.flatMap(tokens), ...(CATEGORY_TERMS[p.category] ?? [])];
    const hay = new Set([...tokens(p.name), ...brand, ...tokens(p.category), ...tags]);
    let score = 0;
    let matched = 0;
    let wordMatched = 0;
    for (const t of q) {
      let s = 0;
      if (tags.includes(t) || brand.includes(t)) s = 3;
      else if (hay.has(t)) s = 2;
      else if (t.length >= 3 && [...hay].some((h) => h.startsWith(t))) s = 1;
      if (s) {
        matched++;
        if (!/^\d+$/.test(t)) wordMatched++;
      }
      score += s;
    }
    const coverage = matched / q.length;
    const ok = (words.length === 0 || wordMatched > 0) && coverage >= (q.length > 1 ? 0.6 : 1);
    return { p, score: ok ? score : 0 };
  }).filter((x) => x.score > 0);
  const best = Math.max(0, ...scored.map((x) => x.score));
  return scored
    .filter((x) => x.score >= best * 0.6)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.p);
}

const GENERIC_BRANDS = ["Generic", "PrimeChoice", "UrbanCraft", "Desi Basics", "Nexa"];

/** For queries with no catalogue match, fabricate plausible demo products so every search works. */
export function syntheticProducts(query: string): MockProduct[] {
  const title = query.trim().replace(/\b\w/g, (c) => c.toUpperCase());
  const categories: MockCategory[] = ["Appliances", "Fashion", "Grocery", "Audio", "Beauty"];
  const category = categories[hash(query) % categories.length];
  return [0, 1, 2].map((i) => {
    const brand = GENERIC_BRANDS[(hash(query) + i) % GENERIC_BRANDS.length];
    const base = 299 + Math.floor(rand(`${query}:${i}:base`) * 12000);
    return {
      key: `syn-${hash(query.toLowerCase())}-${i}`,
      name: `${brand} ${title}${i === 1 ? " Pro" : i === 2 ? " (Pack of 2)" : ""}`,
      brand,
      category,
      basePrice: base,
      tags: tokens(query),
      specs: { Brand: brand, Model: `${title} ${2024 + i}`, Warranty: "1 year" },
      description: `Demo listing generated for “${title}”. Connect a real price provider to see live results.`,
      pros: ["Good value"],
      cons: ["Demo data"],
      launchedDaysAgo: 30 + i * 60,
    };
  });
}

/**
 * Synthetic daily history for a demo product at one retailer, scaled so the series ends at
 * `currentPrice` (keeps history consistent with today's offer).
 */
export function mockHistory(key: string, retailer: RetailerId, currentPrice: number, days = 90): { day: number; price: number }[] {
  const unit = 1_000_000;
  const today = dayIndex();
  const todayFactor = priceOn({ key, basePrice: unit }, retailer, today) / unit;
  const out: { day: number; price: number }[] = [];
  for (let d = days; d >= 1; d--) {
    const factor = priceOn({ key, basePrice: unit }, retailer, today - d) / unit;
    out.push({ day: today - d, price: Math.max(1, Math.round((currentPrice * factor) / todayFactor)) });
  }
  return out;
}

/** Product slug format shared by the catalog store and the seed script. */
export function productSlug(slugBase: string, matchKey: string): string {
  return `${slugBase}-${(hash(matchKey) % 46656).toString(36)}`;
}
