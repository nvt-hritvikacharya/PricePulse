"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, ExternalLink, Star, Truck, Zap } from "lucide-react";
import { cn, formatEta, formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { DemoBadge } from "@/components/shared/demo-badge";
import { getRetailer } from "@/features/retailers/retailers";
import { WishlistButton } from "@/features/products/components/wishlist-button";
import type { OfferDTO } from "../types";
import { AVAILABILITY } from "../availability";


export function DeliveryInfo({ charge, eta, className }: { charge: number | null; eta: number | null; className?: string }) {
  const quick = eta !== null && eta < 0.05;
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1">
        <Truck className="size-3.5" aria-hidden />
        {charge === null ? "Delivery fee varies" : charge === 0 ? <span className="font-semibold text-success">Free delivery</span> : `+${formatINR(charge)} delivery`}
      </span>
      <span className={cn("inline-flex items-center gap-1", quick && "font-semibold text-violet-600 dark:text-violet-400")}>
        {quick ? <Zap className="size-3.5" aria-hidden /> : null}
        {formatEta(eta)}
      </span>
    </div>
  );
}

export function Rating({ value, count }: { value: number | null; count?: number | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">No ratings</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs" aria-label={`Rated ${value} out of 5${count ? ` from ${count} ratings` : ""}`}>
      <span className="inline-flex items-center gap-0.5 rounded-md bg-success px-1.5 py-0.5 font-bold text-white">
        {value.toFixed(1)} <Star className="size-3 fill-current" aria-hidden />
      </span>
      {count ? <span className="text-muted-foreground">({count.toLocaleString("en-IN")})</span> : null}
    </span>
  );
}

export function OfferCard({ offer, index = 0 }: { offer: OfferDTO; index?: number }) {
  const retailer = getRetailer(offer.retailer);
  const avail = AVAILABILITY[offer.availability];
  const oos = offer.availability === "OUT_OF_STOCK";
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ delay: Math.min(index, 12) * 0.03, duration: 0.3 }}
      className={cn("glass group relative flex flex-col overflow-hidden rounded-3xl p-4 transition-shadow hover:shadow-2xl", offer.isBestPrice && !oos && "ring-2 ring-primary/70", oos && "opacity-75")}
      aria-label={`${offer.productName} on ${retailer?.name}`}
    >
      {offer.isBestPrice && !oos && (
        <span className="bg-brand-gradient absolute top-0 left-6 z-10 inline-flex items-center gap-1 rounded-b-xl px-3 py-1 text-xs font-bold text-white shadow-lg">
          <BadgeCheck className="size-3.5" aria-hidden /> Best price
        </span>
      )}
      <div className="absolute top-3 right-3 z-10">
        <WishlistButton productId={offer.productId} compact />
      </div>
      <Link href={`/product/${offer.productSlug}`} className="block">
        <ProductImage src={offer.imageUrl} alt={offer.productName} className="aspect-[4/3] w-full" />
      </Link>
      <div className="mt-4 flex items-center justify-between gap-2">
        <RetailerLogo retailer={offer.retailer} showName size="sm" />
        <Badge variant={avail.variant}>{avail.label}</Badge>
      </div>
      <div className="mt-2 flex-1">
        {offer.brand && <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{offer.brand}</p>}
        <Link href={`/product/${offer.productSlug}`} className="line-clamp-2 font-semibold leading-snug hover:text-primary">
          {offer.title}
        </Link>
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-2">
        <span className="font-display text-2xl font-extrabold tracking-tight">{formatINR(offer.price)}</span>
        {offer.mrp && offer.mrp > offer.price && <span className="text-sm text-muted-foreground line-through">{formatINR(offer.mrp)}</span>}
        {offer.discountPercent > 0 && <span className="text-sm font-bold text-success">{offer.discountPercent}% off</span>}
      </div>
      <DeliveryInfo charge={offer.deliveryCharge} eta={offer.deliveryEtaDays} className="mt-2" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <Rating value={offer.sellerRating} count={offer.ratingCount} />
        {offer.isMock && <DemoBadge />}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/product/${offer.productSlug}`}>Compare</Link>
        </Button>
        <Button size="sm" asChild={!oos} disabled={oos}>
          {oos ? (
            <span>Sold out</span>
          ) : (
            <a href={offer.url} target="_blank" rel="noopener noreferrer sponsored nofollow" aria-label={`Buy on ${retailer?.name} (opens in new tab)`}>
              Buy <ExternalLink aria-hidden />
            </a>
          )}
        </Button>
      </div>
    </motion.article>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="glass rounded-3xl p-4" aria-hidden>
      <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-muted" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-muted" />
      <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="mt-4 h-7 w-1/3 animate-pulse rounded bg-muted" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="h-8 animate-pulse rounded-full bg-muted" />
        <div className="h-8 animate-pulse rounded-full bg-muted" />
      </div>
    </div>
  );
}
