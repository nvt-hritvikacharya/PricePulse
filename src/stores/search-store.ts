"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SortKey } from "@/features/search/types";
import type { RetailerId } from "@/features/retailers/retailers";

interface SearchPrefs {
  sort: SortKey;
  retailerFilter: RetailerId[];
  inStockOnly: boolean;
  /** Local recent searches (instant, works before the server history loads). */
  recent: string[];
  setSort: (s: SortKey) => void;
  toggleRetailer: (r: RetailerId) => void;
  clearRetailers: () => void;
  setInStockOnly: (v: boolean) => void;
  pushRecent: (q: string) => void;
  clearRecent: () => void;
}

export const useSearchStore = create<SearchPrefs>()(
  persist(
    (set) => ({
      sort: "lowest_price",
      retailerFilter: [],
      inStockOnly: false,
      recent: [],
      setSort: (sort) => set({ sort }),
      toggleRetailer: (r) =>
        set((s) => ({ retailerFilter: s.retailerFilter.includes(r) ? s.retailerFilter.filter((x) => x !== r) : [...s.retailerFilter, r] })),
      clearRetailers: () => set({ retailerFilter: [] }),
      setInStockOnly: (inStockOnly) => set({ inStockOnly }),
      pushRecent: (q) =>
        set((s) => ({ recent: [q, ...s.recent.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 8) })),
      clearRecent: () => set({ recent: [] }),
    }),
    { name: "pp-search-prefs", partialize: (s) => ({ sort: s.sort, inStockOnly: s.inStockOnly, recent: s.recent }) },
  ),
);
