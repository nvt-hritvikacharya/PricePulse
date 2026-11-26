import type { Metadata } from "next";
import { WishlistView } from "@/features/products/components/wishlist-view";

export const metadata: Metadata = { title: "Wishlist" };

export default function WishlistPage() {
  return <WishlistView />;
}
