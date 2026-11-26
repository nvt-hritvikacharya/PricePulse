"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Flame, History, Laptop, Shirt, ShoppingBasket, Smartphone, Sparkles, Trash2, Tv, Headphones, Footprints, Clock } from "lucide-react";
import { api } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/skeleton";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { RETAILER_IDS } from "@/features/retailers/retailers";
import { ProductMiniCard, type MiniProduct } from "@/features/products/components/product-mini-card";
import { useSearchStore } from "@/stores/search-store";
import { SearchBar } from "./search-bar";

const CATEGORIES = [
  { label: "Mobiles", q: "smartphone", icon: Smartphone },
  { label: "Laptops", q: "laptop", icon: Laptop },
  { label: "Audio", q: "headphones", icon: Headphones },
  { label: "TVs", q: "smart tv", icon: Tv },
  { label: "Fashion", q: "jeans", icon: Shirt },
  { label: "Footwear", q: "running shoes", icon: Footprints },
  { label: "Beauty", q: "serum", icon: Sparkles },
  { label: "Grocery", q: "atta", icon: ShoppingBasket },
];

function Chip({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="glass inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:text-primary">
      {children}
    </Link>
  );
}

export function HomeView({ firstName }: { firstName: string | null }) {
  const { recent: localRecent, clearRecent } = useSearchStore();
  const popular = useQuery({ queryKey: ["popular"], queryFn: () => api<{ popular: string[]; trending: MiniProduct[] }>("/api/popular") });
  const serverRecent = useQuery({ queryKey: ["recent-searches"], queryFn: () => api<{ recent: { query: string }[] }>("/api/search/recent") });
  const viewed = useQuery({ queryKey: ["recently-viewed"], queryFn: () => api<{ items: { product: MiniProduct }[] }>("/api/recently-viewed") });

  const recent = [...new Set([...localRecent, ...(serverRecent.data?.recent.map((r) => r.query) ?? [])].map((q) => q.trim()))].slice(0, 8);

  async function clearAll() {
    clearRecent();
    await api("/api/search/recent", { method: "DELETE" });
    serverRecent.refetch();
  }

  return (
    <div className="space-y-12">
      <section className="relative mx-auto max-w-3xl pt-6 text-center sm:pt-12">
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 text-sm font-semibold text-primary">
          {firstName ? `Namaste, ${firstName} 👋` : "Namaste 👋"}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
          Find the <span className="text-gradient">best price</span> in India
        </motion.h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">One search across Amazon, Flipkart, Myntra, Croma, Nykaa, Blinkit & 7 more stores – with delivery times, ratings and price history.</p>
        <div className="mt-8">
          <SearchBar autoFocus />
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Popular searches">
          <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Flame className="size-4 text-primary" aria-hidden /> Popular:</span>
          {popular.isLoading
            ? Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-28 rounded-full" />)
            : popular.data?.popular.slice(0, 6).map((q) => (
                <Chip key={q} href={`/search?q=${encodeURIComponent(q)}`}>{q}</Chip>
              ))}
        </div>
      </section>

      <section aria-labelledby="cat-h">
        <h2 id="cat-h" className="sr-only">Categories</h2>
        <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
          {CATEGORIES.map(({ label, q, icon: Icon }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}>
              <Link href={`/search?q=${encodeURIComponent(q)}`} className="glass flex flex-col items-center gap-2 rounded-2xl p-4 text-center text-xs font-semibold transition hover:-translate-y-1 hover:text-primary sm:text-sm">
                <span className="bg-brand-gradient grid size-11 place-items-center rounded-2xl text-white shadow-lg"><Icon className="size-5" aria-hidden /></span>
                {label}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="recent-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="recent-h" className="flex items-center gap-2 font-display text-lg font-bold"><History className="size-5 text-primary" aria-hidden /> Recent searches</h2>
            <button onClick={clearAll} className="inline-flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-destructive"><Trash2 className="size-4" aria-hidden /> Clear</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((q) => <Chip key={q} href={`/search?q=${encodeURIComponent(q)}`}>{q}</Chip>)}
          </div>
        </section>
      )}

      {Boolean(viewed.data?.items.length) && (
        <section aria-labelledby="viewed-h">
          <h2 id="viewed-h" className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Clock className="size-5 text-primary" aria-hidden /> Recently viewed</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {viewed.data!.items.slice(0, 6).map(({ product }, i) => <ProductMiniCard key={product.id} product={product} index={i} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="trend-h">
        <h2 id="trend-h" className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><Flame className="size-5 text-primary" aria-hidden /> Trending deals</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {popular.isLoading
            ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-64" />)
            : popular.data?.trending.map((p, i) => <ProductMiniCard key={p.id} product={p} index={i} />)}
        </div>
        {!popular.isLoading && !popular.data?.trending.length && <p className="text-sm text-muted-foreground">Search for something to start tracking prices.</p>}
      </section>

      <section aria-label="Stores we compare" className="glass rounded-3xl p-6 text-center">
        <p className="mb-4 text-sm font-semibold text-muted-foreground">We compare prices across</p>
        <div className="flex flex-wrap justify-center gap-4">
          {RETAILER_IDS.map((r) => <RetailerLogo key={r} retailer={r} showName size="sm" />)}
        </div>
      </section>
    </div>
  );
}
