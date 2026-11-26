"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Heart, Star } from "lucide-react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductMiniCard, type MiniProduct } from "./product-mini-card";
import { WishlistButton } from "./wishlist-button";

function Grid({ items, loading, empty, withRemove }: { items?: { product: MiniProduct }[]; loading: boolean; empty: string; withRemove?: boolean }) {
  if (loading) return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}</div>;
  if (!items?.length)
    return (
      <div className="glass rounded-3xl p-10 text-center">
        <p className="text-muted-foreground">{empty}</p>
        <Button asChild className="mt-4"><Link href="/home">Start searching</Link></Button>
      </div>
    );
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map(({ product }, i) => (
        <ProductMiniCard key={product.id} product={product} index={i} actions={withRemove ? <WishlistButton productId={product.id} /> : undefined} />
      ))}
    </div>
  );
}

export function WishlistView() {
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: () => api<{ items: { product: MiniProduct }[] }>("/api/wishlist") });
  const favorites = useQuery({ queryKey: ["favorites"], queryFn: () => api<{ items: { product: MiniProduct }[] }>("/api/favorites") });
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold tracking-tight">Saved products</h1>
      <Tabs defaultValue="wishlist">
        <TabsList>
          <TabsTrigger value="wishlist"><Heart aria-hidden /> Wishlist ({wishlist.data?.items.length ?? 0})</TabsTrigger>
          <TabsTrigger value="favorites"><Star aria-hidden /> Favourites ({favorites.data?.items.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="wishlist"><Grid items={wishlist.data?.items} loading={wishlist.isLoading} empty="Your wishlist is empty." withRemove /></TabsContent>
        <TabsContent value="favorites"><Grid items={favorites.data?.items} loading={favorites.isLoading} empty="No favourites yet." /></TabsContent>
      </Tabs>
    </div>
  );
}
