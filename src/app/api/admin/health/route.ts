import { handler, json } from "@/lib/api";
import { kv } from "@/lib/redis";
import { requireAdmin } from "@/features/auth/server/session";
import { describeProviders, isDemoMode } from "@/server/providers/registry";
import { getProviderHealth } from "@/server/providers/resilient";

/** Provider configuration + live health (polled by the admin API-health panel). */
export const GET = handler(async () => {
  await requireAdmin();
  const providers = await Promise.all(
    describeProviders().map(async (p) => ({ ...p, health: await getProviderHealth(p.id) })),
  );
  return json({ providers, cacheBackend: kv.backend, demoMode: isDemoMode() });
});
