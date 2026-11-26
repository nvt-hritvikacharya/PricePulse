"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ProductImage } from "@/components/shared/product-image";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { Price } from "@/components/shared/price";

export interface MiniProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  imageUrl: string | null;
  bestPrice: number | null;
  mrp?: number | null;
  retailer: string | null;
}

export function ProductMiniCard({ product, index = 0, actions }: { product: MiniProduct; index?: number; actions?: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 10) * 0.04 }} className="glass group relative flex flex-col overflow-hidden rounded-2xl p-3 transition hover:-translate-y-0.5 hover:shadow-2xl">
      <Link href={`/product/${product.slug}`} className="flex flex-1 flex-col gap-3 focus-visible:outline-none">
        <ProductImage src={product.imageUrl} alt={product.name} className="aspect-[5/4] w-full" />
        <div className="flex flex-1 flex-col gap-1 px-1">
          {product.brand && <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{product.brand}</span>}
          <span className="line-clamp-2 text-sm font-semibold group-hover:text-primary">{product.name}</span>
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <Price price={product.bestPrice} mrp={product.mrp} size="sm" />
            {product.retailer && <RetailerLogo retailer={product.retailer} size="sm" />}
          </div>
        </div>
      </Link>
      {actions && <div className="mt-2 flex gap-2 px-1">{actions}</div>}
    </motion.div>
  );
}
