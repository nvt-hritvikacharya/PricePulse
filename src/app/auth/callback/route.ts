import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createSupabaseServerClient } from "@/features/auth/server/supabase";
import { startSession, upsertUser } from "@/features/auth/server/session";

/** OAuth (Google) redirect target: exchanges the PKCE code and starts an app session. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/home";

  if (!isSupabaseConfigured || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data.user) throw error ?? new Error("No user returned");
    const meta = data.user.user_metadata ?? {};
    const user = await upsertUser({
      supabaseId: data.user.id,
      email: data.user.email,
      name: (meta.full_name as string) ?? (meta.name as string) ?? null,
      avatarUrl: (meta.avatar_url as string) ?? null,
      method: "GOOGLE",
    });
    await startSession(user, "GOOGLE");
    return NextResponse.redirect(new URL(safeNext, url.origin));
  } catch (err) {
    logger.warn("auth", "OAuth callback failed", { error: (err as Error).message });
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }
}
