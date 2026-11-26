"use client";
import { createBrowserClient } from "@supabase/ssr";

/** Browser Supabase client (used only to kick off Google OAuth). */
export function createSupabaseBrowserClient(url?: string, key?: string) {
  if (!url || !key) return null;
  return createBrowserClient(url, key);
}
