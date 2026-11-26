import "server-only";
import { env } from "@/lib/env";
import { matchRetailer, type RetailerId } from "@/features/retailers/retailers";
import { fetchJson } from "../resilient";
import type { PriceProvider, ProviderOffer } from "../types";
import { amazonPaapiProvider } from "./amazon-paapi";
import { flipkartAffiliateProvider } from "./flipkart-affiliate";

/**
 * SerpApi Google Shopping (India) – aggregate price API covering retailers without a public
 * product API: Myntra, AJIO, Croma, Reliance Digital, Tata CLiQ, Nykaa, Vijay Sales, JioMart,
 * Blinkit, Zepto, BigBasket. Also fills in Amazon/Flipkart when their own APIs aren't configured.
 * Docs: https://serpapi.com/google-shopping-api
 */
interface ShoppingResult {
  title: string;
  source?: string;
  link?: string;
  product_link?: string;
  product_id?: string;
  extracted_price?: number;
  extracted_old_price?: number;
  thumbnail?: string;
  rating?: number;
  reviews?: number;
  delivery?: string;
  extensions?: string[];
}

/** Parses strings like "Free delivery", "+₹40 delivery", "Delivery by Fri" into charge/ETA. */
export function parseDelivery(text?: string): { charge?: number; etaDays?: number } {
  if (!text) return {};
  const t = text.toLowerCase();
  const out: { charge?: number; etaDays?: number } = {};
  if (t.includes("free")) out.charge = 0;
  const money = t.match(/₹\s?([\d,]+(?:\.\d+)?)/);
  if (money) out.charge = Number(money[1].replace(/,/g, ""));
  const mins = t.match(/(\d+)\s*min/);
  if (mins) out.etaDays = Number(mins[1]) / (60 * 24);
  else if (t.includes("today")) out.etaDays = 0.5;
  else if (t.includes("tomorrow")) out.etaDays = 1;
  else {
    const days = t.match(/(\d+)\s*(?:-\s*\d+\s*)?day/);
    if (days) out.etaDays = Number(days[1]);
  }
  return out;
}

const QUICK_COMMERCE: RetailerId[] = ["blinkit", "zepto"];

export const serpapiShoppingProvider: PriceProvider = {
  id: "serpapi-google-shopping",
  name: "SerpApi · Google Shopping (IN)",
  kind: "aggregator",
  retailers: ["myntra", "ajio", "croma", "reliance", "tatacliq", "nykaa", "vijaysales", "jiomart", "blinkit", "zepto", "bigbasket", "amazon", "flipkart"],
  rateLimitPerMinute: 30,
  requiredEnv: ["SERPAPI_API_KEY"],
  isConfigured: () => Boolean(env.SERPAPI_API_KEY),

  async search(query, { limit, signal }) {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", query);
    url.searchParams.set("gl", "in");
    url.searchParams.set("hl", "en");
    url.searchParams.set("location", "India");
    url.searchParams.set("num", String(Math.min(60, limit * 3)));
    url.searchParams.set("api_key", env.SERPAPI_API_KEY!);
    const data = await fetchJson<{ shopping_results?: ShoppingResult[]; error?: string }>(url.toString(), { signal });

    // Avoid duplicating retailers that already have a first-party API configured.
    const skip = new Set<RetailerId>();
    if (amazonPaapiProvider.isConfigured()) skip.add("amazon");
    if (flipkartAffiliateProvider.isConfigured()) skip.add("flipkart");

    return (data.shopping_results ?? []).flatMap((r): ProviderOffer[] => {
      const retailer = matchRetailer(r.source);
      const link = r.link ?? r.product_link;
      if (!retailer || skip.has(retailer) || !r.extracted_price || !link) return [];
      const delivery = parseDelivery(r.delivery ?? r.extensions?.find((e) => /deliver/i.test(e)));
      return [
        {
          providerId: "serpapi-google-shopping",
          retailer,
          externalId: r.product_id,
          title: r.title,
          imageUrl: r.thumbnail,
          url: link,
          price: r.extracted_price,
          mrp: r.extracted_old_price,
          deliveryCharge: delivery.charge,
          deliveryEtaDays: delivery.etaDays ?? (QUICK_COMMERCE.includes(retailer) ? 0.01 : undefined),
          sellerName: r.source,
          sellerRating: r.rating,
          ratingCount: r.reviews,
          availability: "IN_STOCK",
        },
      ];
    });
  },
};
