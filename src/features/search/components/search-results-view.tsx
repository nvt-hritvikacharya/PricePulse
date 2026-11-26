"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertCircle, ArrowRight, Filter, PackageSearch, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { api, ApiError } from "@/lib/api-client";
import { cn, formatINR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RetailerLogo } from "@/components/shared/retailer-logo";
import { DemoBadge } from "@/components/shared/demo-badge";
import { getRetailer, type RetailerId } from "@/features/retailers/retailers";
import { useSearchStore } from "@/stores/search-store";
import { SORT_OPTIONS, type SearchResponse, type SortKey } from "../types";
import { SearchBar } from "./search-bar";
import { OfferCard, OfferCardSkeleton } from "./offer-card";

export function SearchResultsView({ query }: { query: string }) {
  const { sort, setSort, retailerFilter, toggleRetailer, clearRetailers, inStockOnly, setInStockOnly } = useSearchStore();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["search", query, sort],
    queryFn: () => api<SearchResponse>(`/api/search?q=${encodeURIComponent(query)}&sort=${sort}`),
    enabled: query.trim().length >= 2,
    placeholderData: (prev) => (prev?.query === query ? prev : undefined),
  });

  const retailersInResults = useMemo(() => [...new Set(data?.results.map((r) => r.retailer) ?? [])] as RetailerId[], [data]);
  const filtered = useMemo(
    () =>
      (data?.results ?? []).filter(
        (o) => (!retailerFilter.length || retailerFilter.includes(o.retailer)) && (!inStockOnly || o.availability !== "OUT_OF_STOCK"),
      ),
    [data, retailerFilter, inStockOnly],
  );
  const best = useMemo(() => {
    const inStock = (data?.results ?? []).filter((o) => o.availability !== "OUT_OF_STOCK");
    return inStock.length ? inStock.reduce((a, b) => (a.price + (a.deliveryCharge ?? 0) <= b.price + (b.deliveryCharge ?? 0) ? a : b)) : null;
  }, [data]);
  const savings = useMemo(() => {
    if (!best || !data) return 0;
    const same = data.results.filter((o) => o.productId === best.productId);
    return Math.max(0, Math.max(...same.map((o) => o.price)) - best.price);
  }, [best, data]);

  if (query.trim().length < 2) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-10 text-center">
        <h1 className="font-display text-3xl font-bold">What are you shopping for?</h1>
        <SearchBar autoFocus />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <SearchBar defaultValue={query} size="md" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Results for <span className="text-gradient">“{query}”</span>
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
            {isLoading ? "Checking prices across stores…" : data ? `${filtered.length} offers · ${data.productCount} products · ${retailersInResults.length} stores${data.cached ? " · cached" : ""}` : null}
            {data?.isDemo && <DemoBadge />}
            {isFetching && !isLoading && <RefreshCw className="size-3.5 animate-spin" aria-label="Refreshing" />}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch id="instock" checked={inStockOnly} onCheckedChange={setInStockOnly} />
            <Label htmlFor="instock">In stock only</Label>
          </div>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-48" aria-label="Sort results">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {retailersInResults.length > 1 && (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by store">
          <Filter className="size-4 text-muted-foreground" aria-hidden />
          <button onClick={clearRetailers} aria-pressed={!retailerFilter.length} className={cn("cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium transition", !retailerFilter.length ? "bg-foreground text-background" : "glass")}>
            All stores
          </button>
          {retailersInResults.map((r) => (
            <button key={r} onClick={() => toggleRetailer(r)} aria-pressed={retailerFilter.includes(r)} className={cn("inline-flex cursor-pointer items-center gap-1.5 rounded-full py-1 pr-3 pl-1 text-sm font-medium transition", retailerFilter.includes(r) ? "bg-foreground text-background" : "glass")}>
              <RetailerLogo retailer={r} size="sm" /> {getRetailer(r)?.name}
            </button>
          ))}
        </div>
      )}

      {best && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-brand-gradient relative overflow-hidden rounded-3xl p-5 text-white shadow-xl sm:p-6">
          <div className="absolute -top-10 -right-10 size-48 rounded-full bg-white/15 blur-2xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/20"><Trophy className="size-6" aria-hidden /></span>
              <div>
                <p className="text-sm font-semibold text-white/85">Best deal right now</p>
                <p className="line-clamp-1 font-display text-lg font-bold">{best.productName}</p>
                <p className="text-sm text-white/90">
                  {formatINR(best.price)} on {getRetailer(best.retailer)?.name}
                  {savings > 0 && <> · save up to <b>{formatINR(savings)}</b> vs other stores</>}
                </p>
              </div>
            </div>
            <Button asChild variant="secondary" className="bg-white text-slate-900 hover:bg-white/90">
              <Link href={`/product/${best.productSlug}`}>View price history <ArrowRight /></Link>
            </Button>
          </div>
        </motion.div>
      )}

      {error && (
        <div role="alert" className="glass flex items-center justify-between gap-4 rounded-2xl p-5">
          <span className="flex items-center gap-2 text-destructive"><AlertCircle className="size-5" aria-hidden /> {error instanceof ApiError ? error.message : "Search failed"}</span>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy={isLoading}>
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => <OfferCardSkeleton key={i} />)
          : <AnimatePresence mode="popLayout">{filtered.map((o, i) => <OfferCard key={o.id} offer={o} index={i} />)}</AnimatePresence>}
      </div>

      {!isLoading && data && filtered.length === 0 && (
        <div className="glass mx-auto max-w-md rounded-3xl p-10 text-center">
          <PackageSearch className="mx-auto size-10 text-muted-foreground" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-bold">No offers match</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear your filters.</p>
          {(retailerFilter.length > 0 || inStockOnly) && (
            <Button variant="outline" className="mt-4" onClick={() => { clearRetailers(); setInStockOnly(false); }}>Clear filters</Button>
          )}
        </div>
      )}

      {data && (
        <details className="glass rounded-2xl p-4 text-sm">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold"><Activity className="size-4 text-primary" aria-hidden /> Data sources ({data.providers.filter((p) => p.ok).length}/{data.providers.length} healthy · {data.tookMs} ms)</summary>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {data.providers.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2">
                <span className="flex items-center gap-2">{p.kind === "mock" && <Sparkles className="size-4 text-amber-500" aria-hidden />}{p.name}</span>
                <Badge variant={p.ok ? "success" : "destructive"}>{p.ok ? `${p.count} offers` : p.error ?? "error"}</Badge>
              </li>
            ))}
          </ul>
          {data.isDemo && <p className="mt-3 text-xs text-muted-foreground">No provider API keys are configured, so results come from the built-in mock provider. See README → “Price providers”.</p>}
        </details>
      )}
    </div>
  );
}
