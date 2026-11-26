import type { RetailerId } from "@/features/retailers/retailers";

/** Client-safe DTOs shared by API routes and UI. */
export type SortKey = "lowest_price" | "highest_discount" | "fastest_delivery" | "highest_rating" | "newest";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "lowest_price", label: "Lowest price" },
  { value: "highest_discount", label: "Highest discount" },
  { value: "fastest_delivery", label: "Fastest delivery" },
  { value: "highest_rating", label: "Highest rating" },
  { value: "newest", label: "Newest" },
];

export type Availability = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "PREORDER" | "UNKNOWN";

export interface OfferDTO {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  title: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  retailer: RetailerId;
  providerId: string;
  url: string;
  price: number;
  mrp: number | null;
  discountPercent: number;
  deliveryCharge: number | null;
  deliveryEtaDays: number | null;
  sellerName: string | null;
  sellerRating: number | null;
  ratingCount: number | null;
  availability: Availability;
  isMock: boolean;
  isBestPrice: boolean;
  releasedAt: string | null;
  fetchedAt: string;
}

export interface ProviderStatusDTO {
  id: string;
  name: string;
  kind: string;
  ok: boolean;
  count: number;
  error?: string;
}

export interface SearchResponse {
  query: string;
  sort: SortKey;
  results: OfferDTO[];
  productCount: number;
  providers: ProviderStatusDTO[];
  isDemo: boolean;
  cached: boolean;
  tookMs: number;
}

export interface SuggestionDTO {
  type: "product" | "query" | "brand";
  label: string;
  productId?: string;
  slug?: string;
}
