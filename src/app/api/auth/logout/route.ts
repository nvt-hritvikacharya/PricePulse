import { handler, json } from "@/lib/api";
import { isSupabaseConfigured } from "@/lib/env";
import { endSession } from "@/features/auth/server/session";
import { createSupabaseServerClient } from "@/features/auth/server/supabase";

export const POST = handler(async () => {
  await endSession();
  if (isSupabaseConfigured) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut().catch(() => undefined);
  }
  return json({ ok: true });
});
