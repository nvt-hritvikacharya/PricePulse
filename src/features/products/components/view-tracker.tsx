"use client";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

/** Records a product view once per mount (recently viewed + analytics). */
export function ViewTracker({ productId }: { productId: string }) {
  const qc = useQueryClient();
  useEffect(() => {
    fetch(`/api/products/${productId}/view`, { method: "POST" })
      .then(() => qc.invalidateQueries({ queryKey: ["recently-viewed"] }))
      .catch(() => undefined);
  }, [productId, qc]);
  return null;
}
