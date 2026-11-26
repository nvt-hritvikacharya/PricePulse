import type { Availability } from "./types";

export const AVAILABILITY: Record<Availability, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  IN_STOCK: { label: "In stock", variant: "success" },
  LOW_STOCK: { label: "Few left", variant: "warning" },
  OUT_OF_STOCK: { label: "Out of stock", variant: "destructive" },
  PREORDER: { label: "Pre-order", variant: "secondary" },
  UNKNOWN: { label: "Check site", variant: "secondary" },
};
