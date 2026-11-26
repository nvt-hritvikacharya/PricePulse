import Link from "next/link";
import { ChevronRight, ExternalLink, ListChecks, MessageSquareQuote, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { formatINR } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImage } from "@/components/shared/product-image";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { DemoBadge } from "@/components/shared/demo-badge";
import { Price } from "@/components/shared/price";
import { getRetailer } from "@/features/retailers/retailers";
import { DeliveryInfo, Rating } from "@/features/search/components/offer-card";
import { AVAILABILITY } from "@/features/search/availability";
import { CreateAlertDialog } from "@/features/alerts/components/create-alert-dialog";
import type { ProductDetail } from "@/server/pricing/product-service";
import { PriceHistoryChart } from "./price-history-chart";
import { RecommendationCard } from "./recommendation-card";
import { WishlistButton } from "./wishlist-button";
import { FavoriteButton } from "./favorite-button";
import { ViewTracker } from "./view-tracker";
import { ProductMiniCard, type MiniProduct } from "./product-mini-card";

/** Product details (server component) with client islands for charts, alerts and actions. */
export function ProductDetailView({ product, related }: { product: ProductDetail; related: MiniProduct[] }) {
  const best = product.bestOffer;
  const review = product.reviewSummary;
  const maxPrice = Math.max(...product.offers.map((o) => o.price));
  const specs = Object.entries(product.specs);

  return (
    <div className="space-y-8">
      <ViewTracker productId={product.id} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/home" className="hover:text-foreground">Search</Link>
        <ChevronRight className="size-4" aria-hidden />
        {product.category && (
          <>
            <Link href={`/search?q=${encodeURIComponent(product.category)}`} className="hover:text-foreground">{product.category}</Link>
            <ChevronRight className="size-4" aria-hidden />
          </>
        )}
        <span className="line-clamp-1 text-foreground" aria-current="page">{product.brand ?? product.name}</span>
      </nav>

      <section className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <div className="glass self-start rounded-3xl p-4">
          <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[5/4] w-full rounded-2xl" priority sizes="(max-width: 1024px) 100vw, 420px" />
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {product.brand && <Badge variant="secondary">{product.brand}</Badge>}
            {product.category && <Badge variant="outline">{product.category}</Badge>}
            {product.isMock && <DemoBadge />}
          </div>
          <h1 className="font-display text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">{product.name}</h1>
          {review?.averageRating && <Rating value={review.averageRating} count={review.totalRatings} />}
          {best && (
            <div className="glass rounded-3xl p-5">
              <p className="text-sm text-muted-foreground">Best price across {product.offers.length} stores</p>
              <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <Price price={best.price} mrp={best.mrp} size="lg" />
                  <div className="mt-2 flex items-center gap-3">
                    <RetailerLogo retailer={best.retailer} showName size="sm" />
                    <DeliveryInfo charge={best.deliveryCharge} eta={best.deliveryEtaDays} />
                  </div>
                  {maxPrice > best.price && <p className="mt-2 text-sm font-semibold text-success">Save up to {formatINR(maxPrice - best.price)} vs. the priciest store</p>}
                </div>
                <Button size="lg" asChild>
                  <a href={best.url} target="_blank" rel="noopener noreferrer sponsored nofollow">
                    Buy on {getRetailer(best.retailer)?.name} <ExternalLink aria-hidden />
                  </a>
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <CreateAlertDialog productId={product.id} productName={product.name} currentPrice={best?.price ?? null} retailers={product.offers.map((o) => o.retailer)} />
            <WishlistButton productId={product.id} />
            <FavoriteButton productId={product.id} />
          </div>
          {product.description && <p className="text-muted-foreground">{product.description}</p>}
          <RecommendationCard productId={product.id} />
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Price comparison</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <caption className="sr-only">Prices for {product.name} across stores</caption>
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <th scope="col" className="py-3 pr-3 font-semibold">Store</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Price</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Delivery</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Rating</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Availability</th>
                <th scope="col" className="py-3 text-right font-semibold"><span className="sr-only">Action</span></th>
              </tr>
            </thead>
            <tbody>
              {product.offers.map((o) => (
                <tr key={o.id} className="border-b border-border/60 last:border-0">
                  <td className="py-3 pr-3">
                    <div className="flex items-center gap-2">
                      <RetailerLogo retailer={o.retailer} showName size="sm" />
                      {o.isBestPrice && <Badge>Lowest</Badge>}
                    </div>
                  </td>
                  <td className="py-3 pr-3">
                    <span className="font-display text-base font-bold">{formatINR(o.price)}</span>
                    {o.discountPercent > 0 && <span className="ml-2 text-xs font-semibold text-success">{o.discountPercent}% off</span>}
                    {o.price > (best?.price ?? 0) && <span className="block text-xs text-muted-foreground">+{formatINR(o.price - (best?.price ?? 0))} vs best</span>}
                  </td>
                  <td className="py-3 pr-3"><DeliveryInfo charge={o.deliveryCharge} eta={o.deliveryEtaDays} /></td>
                  <td className="py-3 pr-3"><Rating value={o.sellerRating} count={o.ratingCount} /></td>
                  <td className="py-3 pr-3"><Badge variant={AVAILABILITY[o.availability].variant}>{AVAILABILITY[o.availability].label}</Badge></td>
                  <td className="py-3 text-right">
                    <Button size="sm" variant={o.isBestPrice ? "default" : "outline"} asChild>
                      <a href={o.url} target="_blank" rel="noopener noreferrer sponsored nofollow" aria-label={`Buy on ${getRetailer(o.retailer)?.name} (opens in new tab)`}>Buy <ExternalLink aria-hidden /></a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <PriceHistoryChart productId={product.id} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ListChecks className="size-5 text-primary" aria-hidden /> Specifications</CardTitle></CardHeader>
          <CardContent>
            {specs.length ? (
              <dl className="divide-y divide-border/60">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[140px_1fr] gap-3 py-2.5 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Specifications aren&apos;t available from the data source for this product.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquareQuote className="size-5 text-primary" aria-hidden /> Reviews summary</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {review ? (
              <>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <p className="font-display text-4xl font-extrabold">{review.averageRating ?? "—"}</p>
                    <p className="flex items-center justify-center gap-0.5 text-amber-500" aria-hidden>
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={i < Math.round(review.averageRating ?? 0) ? "size-4 fill-current" : "size-4"} />)}
                    </p>
                    <p className="text-xs text-muted-foreground">{review.totalRatings.toLocaleString("en-IN")} ratings</p>
                  </div>
                  <div className="flex-1 space-y-1">
                    {[5, 4, 3, 2, 1].map((s) => (
                      <div key={s} className="flex items-center gap-2 text-xs">
                        <span className="w-3">{s}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${review.distribution[String(s)] ?? 0}%` }} />
                        </div>
                        <span className="w-8 text-right text-muted-foreground">{review.distribution[String(s)] ?? 0}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {(review.pros.length > 0 || review.cons.length > 0) && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ul className="space-y-1.5 text-sm" aria-label="What buyers like">
                      {review.pros.map((p) => <li key={p} className="flex gap-2"><ThumbsUp className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />{p}</li>)}
                    </ul>
                    <ul className="space-y-1.5 text-sm" aria-label="What buyers dislike">
                      {review.cons.map((c) => <li key={c} className="flex gap-2"><ThumbsDown className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />{c}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Aggregated from store ratings across {product.offers.length} retailers.</p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-h">
          <h2 id="related-h" className="mb-4 font-display text-xl font-bold">Related products</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {related.map((p, i) => <ProductMiniCard key={p.id} product={p} index={i} />)}
          </div>
        </section>
      )}
    </div>
  );
}
