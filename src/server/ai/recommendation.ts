import "server-only";
import { z } from "zod";
import { env } from "@/lib/env";
import { cached } from "@/lib/redis";
import { logger } from "@/lib/logger";
import { formatINR } from "@/lib/utils";
import { getRetailer } from "@/features/retailers/retailers";
import type { ProductDetail, PriceHistory } from "../pricing/product-service";

/**
 * Buy/wait recommendation. Uses any OpenAI-compatible chat completions endpoint when
 * LLM_API_KEY is set; otherwise (or on failure) a transparent rule-based engine.
 */
export type Verdict = "BUY_NOW" | "GOOD_DEAL" | "WAIT" | "AVOID";

export interface Recommendation {
  verdict: Verdict;
  headline: string;
  reasoning: string[];
  bestRetailer: string | null;
  confidence: number;
  source: "llm" | "rules";
  model?: string;
}

const llmSchema = z.object({
  verdict: z.enum(["BUY_NOW", "GOOD_DEAL", "WAIT", "AVOID"]),
  headline: z.string().max(140),
  reasoning: z.array(z.string().max(240)).min(1).max(5),
  confidence: z.number().min(0).max(1),
});

export function ruleBasedRecommendation(product: ProductDetail, history: PriceHistory): Recommendation {
  const best = product.bestOffer;
  const { lowest, average, highest } = history.stats;
  const reasoning: string[] = [];
  if (!best) {
    return { verdict: "WAIT", headline: "No live offers right now", reasoning: ["We couldn't find an in-stock offer. Set a price alert and we'll ping you."], bestRetailer: null, confidence: 0.4, source: "rules" };
  }
  const retailerName = getRetailer(best.retailer)?.name ?? best.retailer;
  const price = best.price;
  let verdict: Verdict = "GOOD_DEAL";
  let confidence = 0.6;

  if (lowest && average && highest) {
    const range = Math.max(1, highest - lowest);
    const position = (price - lowest) / range; // 0 = at 90-day low, 1 = at high
    const vsAvg = ((price - average) / average) * 100;
    reasoning.push(`Best price ${formatINR(price)} on ${retailerName} is ${Math.abs(vsAvg).toFixed(1)}% ${vsAvg <= 0 ? "below" : "above"} the ${history.days}-day average of ${formatINR(average)}.`);
    if (position <= 0.15) {
      verdict = "BUY_NOW";
      confidence = 0.85;
      reasoning.push(`It's at or near the ${history.days}-day low of ${formatINR(lowest)}.`);
    } else if (position >= 0.7) {
      verdict = "WAIT";
      confidence = 0.75;
      reasoning.push(`Prices dipped to ${formatINR(lowest)} recently – a sale may bring it back down.`);
    } else {
      reasoning.push(`It's mid-range between the low (${formatINR(lowest)}) and high (${formatINR(highest)}).`);
    }
  }
  const spread = product.offers.length > 1 ? Math.max(...product.offers.map((o) => o.price)) - price : 0;
  if (spread > 0) reasoning.push(`Buying on ${retailerName} saves up to ${formatINR(spread)} versus other stores.`);
  const rating = product.reviewSummary?.averageRating;
  if (rating && rating < 3.6) {
    verdict = verdict === "BUY_NOW" ? "GOOD_DEAL" : "AVOID";
    reasoning.push(`Average rating is only ${rating}★ – check reviews before buying.`);
  } else if (rating) {
    reasoning.push(`Well rated at ${rating}★ across ${product.reviewSummary?.totalRatings.toLocaleString("en-IN")} ratings.`);
  }

  const headlines: Record<Verdict, string> = {
    BUY_NOW: `Great time to buy – near the lowest price on ${retailerName}`,
    GOOD_DEAL: `Fair deal on ${retailerName}; buy if you need it now`,
    WAIT: "Consider waiting – prices are above their recent lows",
    AVOID: "Proceed with caution",
  };
  return { verdict, headline: headlines[verdict], reasoning: reasoning.slice(0, 5), bestRetailer: best.retailer, confidence, source: "rules" };
}

async function llmRecommendation(product: ProductDetail, history: PriceHistory, fallback: Recommendation): Promise<Recommendation> {
  const offers = product.offers.slice(0, 8).map((o) => ({
    store: getRetailer(o.retailer)?.name,
    price: o.price,
    mrp: o.mrp,
    delivery: o.deliveryCharge,
    etaDays: o.deliveryEtaDays,
    rating: o.sellerRating,
    availability: o.availability,
  }));
  const prompt = {
    product: { name: product.name, brand: product.brand, category: product.category },
    offers,
    history: history.stats,
    reviews: product.reviewSummary,
  };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const res = await fetch(`${env.LLM_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.LLM_API_KEY}` },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a shopping advisor for Indian consumers. Given live offers (INR) and price history, decide BUY_NOW, GOOD_DEAL, WAIT or AVOID. " +
              'Respond ONLY with JSON: {"verdict":..., "headline": <=120 chars, "reasoning": [2-4 short bullet strings citing ₹ numbers], "confidence": 0..1}.',
          },
          { role: "user", content: JSON.stringify(prompt) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}`);
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = llmSchema.parse(JSON.parse(data.choices?.[0]?.message?.content ?? "{}"));
    return { ...parsed, bestRetailer: fallback.bestRetailer, source: "llm", model: env.LLM_MODEL };
  } finally {
    clearTimeout(timer);
  }
}

export async function getRecommendation(product: ProductDetail, history: PriceHistory): Promise<Recommendation> {
  const rules = ruleBasedRecommendation(product, history);
  if (!env.LLM_API_KEY) return rules;
  const key = `reco:v1:${product.id}:${product.bestOffer?.price ?? 0}`;
  try {
    const { value } = await cached(key, 6 * 3600, () => llmRecommendation(product, history, rules));
    return value;
  } catch (err) {
    logger.warn("ai", "LLM recommendation failed, using rules", { error: (err as Error).message });
    return rules;
  }
}
