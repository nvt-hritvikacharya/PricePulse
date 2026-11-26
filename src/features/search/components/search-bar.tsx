"use client";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { History, Loader2, Mic, MicOff, Package, Search, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { useVoiceSearch } from "@/hooks/use-voice-search";
import { useSearchStore } from "@/stores/search-store";
import type { SuggestionDTO } from "../types";

/** Accessible combobox search with autocomplete, recent searches and voice input. */
export function SearchBar({ defaultValue = "", size = "lg", autoFocus }: { defaultValue?: string; size?: "md" | "lg"; autoFocus?: boolean }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { recent, pushRecent } = useSearchStore();
  const debounced = useDebounce(value.trim(), 180);

  useEffect(() => setValue(defaultValue), [defaultValue]);

  const { data, isFetching } = useQuery({
    queryKey: ["suggest", debounced],
    queryFn: () => api<{ suggestions: SuggestionDTO[] }>(`/api/suggest?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  });

  const items: SuggestionDTO[] =
    debounced.length >= 2 ? (data?.suggestions ?? []) : recent.slice(0, 6).map((q) => ({ type: "query" as const, label: q }));

  const go = useCallback(
    (q: string, s?: SuggestionDTO) => {
      setOpen(false);
      if (s?.type === "product" && s.slug) {
        router.push(`/product/${s.slug}`);
        return;
      }
      const query = q.trim();
      if (query.length < 2) {
        toast.info("Type at least 2 characters to search");
        return;
      }
      pushRecent(query);
      router.push(`/search?q=${encodeURIComponent(query)}`);
    },
    [router, pushRecent],
  );

  const voice = useVoiceSearch(
    useCallback(
      (text: string) => {
        setValue(text);
        go(text);
      },
      [go],
    ),
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) setOpen(true);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Enter" && active >= 0 && items[active]) {
      e.preventDefault();
      go(items[active].label, items[active]);
    }
  };

  const tall = size === "lg";
  return (
    <form
      role="search"
      className="relative w-full"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
    >
      <div className={cn("glass flex items-center gap-2 rounded-full pr-2 pl-5 shadow-xl transition focus-within:ring-2 focus-within:ring-ring/60", tall ? "h-16" : "h-12")}>
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          aria-label="Search products across stores"
          placeholder="Search iPhone 16, running shoes, atta…"
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          className={cn("h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden", tall ? "text-lg" : "text-base")}
        />
        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />}
        {value && (
          <button type="button" aria-label="Clear search" onClick={() => { setValue(""); inputRef.current?.focus(); }} className="cursor-pointer rounded-full p-1.5 text-muted-foreground hover:bg-muted">
            <X className="size-4" />
          </button>
        )}
        {voice.supported && (
          <button
            type="button"
            onClick={voice.toggle}
            aria-label={voice.listening ? "Stop voice search" : "Search by voice"}
            aria-pressed={voice.listening}
            className={cn("cursor-pointer rounded-full p-2 transition", voice.listening ? "animate-pulse bg-destructive/15 text-destructive" : "text-muted-foreground hover:bg-muted")}
          >
            {voice.listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
        <button type="submit" className={cn("bg-brand-gradient cursor-pointer rounded-full font-semibold text-white shadow-lg transition hover:brightness-105", tall ? "h-12 px-6" : "h-9 px-4 text-sm")}>
          Compare
        </button>
      </div>

      <AnimatePresence>
        {open && items.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-border bg-popover p-2 shadow-2xl"
          >
            {debounced.length < 2 && <li className="px-3 pt-1 pb-2 text-xs font-semibold text-muted-foreground">Recent searches</li>}
            {items.map((s, i) => {
              const Icon = debounced.length < 2 ? History : s.type === "product" ? Package : TrendingUp;
              return (
                <li
                  key={`${s.type}-${s.label}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    go(s.label, s);
                  }}
                  onMouseEnter={() => setActive(i)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-sm", i === active && "bg-muted")}
                >
                  <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <span className="line-clamp-1 flex-1">{s.label}</span>
                  {s.type === "product" && <span className="text-xs text-muted-foreground">Product</span>}
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </form>
  );
}
