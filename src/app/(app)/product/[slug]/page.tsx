import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getProduct, getRelatedProducts } from "@/server/pricing/product-service";
import { ProductDetailView } from "@/features/products/components/product-detail-view";
import { formatINR } from "@/lib/utils";

const load = cache((slug: string) => getProduct(slug));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) return { title: "Product not found" };
  const price = product.bestOffer ? ` from ${formatINR(product.bestOffer.price)}` : "";
  return {
    title: `${product.name}${price}`,
    description: `Compare ${product.name} prices across ${product.offers.length} Indian stores${price}. See 90-day price history and set a price-drop alert.`,
    openGraph: { title: product.name, images: product.imageUrl ? [product.imageUrl] : undefined },
    alternates: { canonical: `/product/${product.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await load(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(product.id, product.category, product.brand);

  const prices = product.offers.map((o) => o.price);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.imageUrl,
    aggregateRating: product.reviewSummary?.averageRating
      ? { "@type": "AggregateRating", ratingValue: product.reviewSummary.averageRating, ratingCount: Math.max(1, product.reviewSummary.totalRatings) }
      : undefined,
    offers: prices.length
      ? { "@type": "AggregateOffer", priceCurrency: "INR", lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length }
      : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ProductDetailView product={product} related={related} />
    </>
  );
}
