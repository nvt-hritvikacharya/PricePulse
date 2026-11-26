import type { Metadata } from "next";
import { SearchResultsView } from "@/features/search/components/search-results-view";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `${q} – compare prices` : "Search",
    description: q ? `Compare ${q} prices across Amazon, Flipkart, Croma, Myntra and more Indian stores.` : undefined,
  };
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <SearchResultsView query={q} />;
}
