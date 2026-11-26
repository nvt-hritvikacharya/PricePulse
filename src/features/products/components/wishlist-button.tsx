"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WishlistResponse {
  items: { product: { id: string } }[];
}

/** Toggle a product in the wishlist (optimistic). Shares one cached wishlist query app-wide. */
export function WishlistButton({ productId, compact }: { productId: string; compact?: boolean }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["wishlist"], queryFn: () => api<WishlistResponse>("/api/wishlist"), staleTime: 5 * 60_000 });
  const saved = Boolean(data?.items.some((i) => i.product.id === productId));

  const mutation = useMutation({
    mutationFn: (wasSaved: boolean) =>
      wasSaved ? api(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: "DELETE" }) : api("/api/wishlist", { method: "POST", json: { productId } }),
    onMutate: async (wasSaved) => {
      await qc.cancelQueries({ queryKey: ["wishlist"] });
      const prev = qc.getQueryData<WishlistResponse>(["wishlist"]);
      qc.setQueryData<WishlistResponse>(["wishlist"], (old) => ({
        items: wasSaved ? (old?.items ?? []).filter((i) => i.product.id !== productId) : [...(old?.items ?? []), { product: { id: productId } }],
      }));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(["wishlist"], ctx?.prev);
      toast.error("Couldn't update wishlist");
    },
    onSuccess: (_data, wasSaved) => toast.success(wasSaved ? "Removed from wishlist" : "Saved to wishlist"),
    onSettled: () => qc.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  return (
    <Button
      variant={compact ? "glass" : "outline"}
      size={compact ? "icon-sm" : "default"}
      aria-pressed={saved}
      aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
      onClick={() => mutation.mutate(saved)}
      className={cn(saved && "text-rose-500")}
    >
      <Heart className={cn(saved && "fill-current")} />
      {!compact && (saved ? "Wishlisted" : "Wishlist")}
    </Button>
  );
}
