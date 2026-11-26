"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface FavResponse {
  items: { product: { id: string } }[];
}

export function FavoriteButton({ productId }: { productId: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["favorites"], queryFn: () => api<FavResponse>("/api/favorites") });
  const fav = Boolean(data?.items.some((i) => i.product.id === productId));
  const m = useMutation({
    mutationFn: (wasFav: boolean) => (wasFav ? api(`/api/favorites?productId=${productId}`, { method: "DELETE" }) : api("/api/favorites", { method: "POST", json: { productId } })),
    onSuccess: (_data, wasFav) => {
      toast.success(wasFav ? "Removed from favourites" : "Added to favourites");
      qc.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
  return (
    <Button variant="outline" size="icon" aria-pressed={fav} aria-label={fav ? "Remove from favourites" : "Add to favourites"} onClick={() => m.mutate(fav)} className={cn(fav && "text-amber-500")}>
      <Star className={cn(fav && "fill-current")} />
    </Button>
  );
}
