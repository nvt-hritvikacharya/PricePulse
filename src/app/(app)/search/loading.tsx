import { OfferCardSkeleton } from "@/features/search/components/offer-card";

export default function Loading() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading results">
      {Array.from({ length: 8 }).map((_, i) => <OfferCardSkeleton key={i} />)}
    </div>
  );
}
