import "server-only";
import { createHash, createHmac } from "node:crypto";
import { env } from "@/lib/env";
import { fetchJson } from "../resilient";
import { ProviderError, type PriceProvider, type ProviderOffer } from "../types";

/**
 * Amazon Product Advertising API 5.0 – SearchItems on the India marketplace.
 * Docs: https://webservices.amazon.com/paapi5/documentation/search-items.html
 * Requests are signed with AWS Signature V4 (service "ProductAdvertisingAPI").
 */

interface PaapiItem {
  ASIN: string;
  DetailPageURL: string;
  Images?: { Primary?: { Large?: { URL: string } } };
  ItemInfo?: {
    Title?: { DisplayValue: string };
    ByLineInfo?: { Brand?: { DisplayValue: string } };
    Classifications?: { ProductGroup?: { DisplayValue: string } };
    Features?: { DisplayValues: string[] };
  };
  Offers?: {
    Listings?: Array<{
      Price?: { Amount: number };
      SavingBasis?: { Amount: number };
      Availability?: { Message?: string; Type?: string };
      DeliveryInfo?: { IsFreeShippingEligible?: boolean; IsPrimeEligible?: boolean };
      MerchantInfo?: { Name?: string; FeedbackRating?: number };
    }>;
  };
  CustomerReviews?: { StarRating?: { Value: number }; Count?: number };
}

const RESOURCES = [
  "Images.Primary.Large",
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "ItemInfo.Classifications",
  "ItemInfo.Features",
  "Offers.Listings.Price",
  "Offers.Listings.SavingBasis",
  "Offers.Listings.Availability.Message",
  "Offers.Listings.Availability.Type",
  "Offers.Listings.DeliveryInfo.IsFreeShippingEligible",
  "Offers.Listings.DeliveryInfo.IsPrimeEligible",
  "Offers.Listings.MerchantInfo",
  "CustomerReviews.StarRating",
  "CustomerReviews.Count",
];

const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data, "utf8").digest();
const sha256 = (data: string) => createHash("sha256").update(data, "utf8").digest("hex");

/** AWS SigV4 headers for a PA-API POST request. Exported for unit testing. */
export function signPaapiRequest(opts: {
  host: string;
  region: string;
  path: string;
  target: string;
  body: string;
  accessKey: string;
  secretKey: string;
  now?: Date;
}) {
  const service = "ProductAdvertisingAPI";
  const now = opts.now ?? new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const headers: Record<string, string> = {
    "content-encoding": "amz-1.0",
    "content-type": "application/json; charset=utf-8",
    host: opts.host,
    "x-amz-date": amzDate,
    "x-amz-target": opts.target,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((k) => `${k}:${headers[k]}\n`)
    .join("");
  const canonicalRequest = ["POST", opts.path, "", canonicalHeaders, signedHeaders, sha256(opts.body)].join("\n");
  const scope = `${dateStamp}/${opts.region}/${service}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const kDate = hmac(`AWS4${opts.secretKey}`, dateStamp);
  const kSigning = hmac(hmac(hmac(kDate, opts.region), service), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign, "utf8").digest("hex");
  return {
    ...headers,
    Authorization: `AWS4-HMAC-SHA256 Credential=${opts.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

function availability(msg?: string, type?: string): ProviderOffer["availability"] {
  const m = (msg ?? "").toLowerCase();
  if (type === "Preorderable" || m.includes("pre-order")) return "PREORDER";
  if (m.includes("only") && m.includes("left")) return "LOW_STOCK";
  if (m.includes("unavailable") || m.includes("out of stock")) return "OUT_OF_STOCK";
  if (m.includes("in stock") || type === "Now") return "IN_STOCK";
  return "UNKNOWN";
}

export const amazonPaapiProvider: PriceProvider = {
  id: "amazon-paapi",
  name: "Amazon PA-API 5.0",
  kind: "official-api",
  retailers: ["amazon"],
  rateLimitPerMinute: 60, // PA-API default: 1 TPS, scaled by revenue
  requiredEnv: ["AMAZON_PAAPI_ACCESS_KEY", "AMAZON_PAAPI_SECRET_KEY", "AMAZON_PAAPI_PARTNER_TAG"],
  isConfigured: () => Boolean(env.AMAZON_PAAPI_ACCESS_KEY && env.AMAZON_PAAPI_SECRET_KEY && env.AMAZON_PAAPI_PARTNER_TAG),

  async search(query, { limit, signal }) {
    const path = "/paapi5/searchitems";
    const body = JSON.stringify({
      Keywords: query,
      PartnerTag: env.AMAZON_PAAPI_PARTNER_TAG,
      PartnerType: "Associates",
      Marketplace: "www.amazon.in",
      ItemCount: Math.min(10, limit),
      Resources: RESOURCES,
    });
    const headers = signPaapiRequest({
      host: env.AMAZON_PAAPI_HOST,
      region: env.AMAZON_PAAPI_REGION,
      path,
      target: "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
      body,
      accessKey: env.AMAZON_PAAPI_ACCESS_KEY!,
      secretKey: env.AMAZON_PAAPI_SECRET_KEY!,
    });
    const data = await fetchJson<{ SearchResult?: { Items?: PaapiItem[] }; Errors?: { Message: string }[] }>(
      `https://${env.AMAZON_PAAPI_HOST}${path}`,
      { method: "POST", headers, body, signal },
    );
    if (data.Errors?.length && !data.SearchResult) throw new ProviderError(data.Errors[0].Message, 400, false);

    return (data.SearchResult?.Items ?? []).flatMap((item): ProviderOffer[] => {
      const listing = item.Offers?.Listings?.[0];
      const price = listing?.Price?.Amount;
      const title = item.ItemInfo?.Title?.DisplayValue;
      if (!price || !title) return [];
      return [
        {
          providerId: "amazon-paapi",
          retailer: "amazon",
          externalId: item.ASIN,
          title,
          brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
          category: item.ItemInfo?.Classifications?.ProductGroup?.DisplayValue,
          imageUrl: item.Images?.Primary?.Large?.URL,
          url: item.DetailPageURL,
          price,
          mrp: listing?.SavingBasis?.Amount,
          deliveryCharge: listing?.DeliveryInfo?.IsFreeShippingEligible ? 0 : undefined,
          deliveryEtaDays: listing?.DeliveryInfo?.IsPrimeEligible ? 1 : 3,
          sellerName: listing?.MerchantInfo?.Name,
          sellerRating: item.CustomerReviews?.StarRating?.Value,
          ratingCount: item.CustomerReviews?.Count,
          availability: availability(listing?.Availability?.Message, listing?.Availability?.Type),
          specs: item.ItemInfo?.Features?.DisplayValues
            ? Object.fromEntries(item.ItemInfo.Features.DisplayValues.slice(0, 6).map((f, i) => [`Feature ${i + 1}`, f]))
            : undefined,
        },
      ];
    });
  },
};
