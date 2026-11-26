import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { kv } from "@/lib/redis";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { ProviderError, type PriceProvider, type ProviderOffer } from "./types";

const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_COOLDOWN_MS = 60_000;

export interface ProviderHealth {
  id: string;
  calls: number;
  failures: number;
  consecutiveFailures: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
  lastError?: string;
  lastSuccessAt?: number;
  lastFailureAt?: number;
  circuitOpenUntil?: number;
  status: "healthy" | "degraded" | "down" | "idle";
}

const healthKey = (id: string) => `provider:health:${id}`;

export async function getProviderHealth(id: string): Promise<ProviderHealth> {
  const h = await kv.hgetall(healthKey(id));
  const num = (k: string) => (h[k] ? Number(h[k]) : 0);
  const calls = num("calls");
  const failures = num("failures");
  const consecutive = num("consecutiveFailures");
  const circuitOpenUntil = num("circuitOpenUntil") || undefined;
  let status: ProviderHealth["status"] = "idle";
  if (circuitOpenUntil && circuitOpenUntil > Date.now()) status = "down";
  else if (calls > 0) status = consecutive > 0 || failures / calls > 0.2 ? "degraded" : "healthy";
  return {
    id,
    calls,
    failures,
    consecutiveFailures: consecutive,
    avgLatencyMs: Math.round(num("avgLatencyMs")),
    lastLatencyMs: num("lastLatencyMs"),
    lastError: h.lastError || undefined,
    lastSuccessAt: num("lastSuccessAt") || undefined,
    lastFailureAt: num("lastFailureAt") || undefined,
    circuitOpenUntil,
    status,
  };
}

async function recordResult(id: string, ok: boolean, latencyMs: number, error?: string, statusCode?: number) {
  const prev = await kv.hgetall(healthKey(id));
  const avg = prev.avgLatencyMs ? Number(prev.avgLatencyMs) * 0.8 + latencyMs * 0.2 : latencyMs;
  await kv.hincrby(healthKey(id), "calls", 1);
  if (ok) {
    await kv.hset(healthKey(id), { consecutiveFailures: 0, lastLatencyMs: latencyMs, avgLatencyMs: avg, lastSuccessAt: Date.now() });
  } else {
    await kv.hincrby(healthKey(id), "failures", 1);
    const consecutive = await kv.hincrby(healthKey(id), "consecutiveFailures", 1);
    const values: Record<string, string | number> = {
      lastLatencyMs: latencyMs,
      avgLatencyMs: avg,
      lastFailureAt: Date.now(),
      lastError: (error ?? "unknown").slice(0, 300),
    };
    if (consecutive >= CIRCUIT_THRESHOLD) values.circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
    await kv.hset(healthKey(id), values);
  }
  db.providerCall
    .create({ data: { providerId: id, operation: "search", ok, latencyMs, statusCode, error: error?.slice(0, 500) } })
    .catch(() => undefined);
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new ProviderError("aborted", undefined, false));
    });
  });

function isRetryable(err: unknown): boolean {
  if (err instanceof ProviderError) {
    if (!err.retryable) return false;
    if (err.status && err.status >= 400 && err.status < 500 && err.status !== 429) return false;
  }
  return true;
}

/**
 * Executes `provider.search` with: provider-level rate limiting, circuit breaker,
 * per-attempt timeout, exponential backoff with full jitter, and health/latency tracking.
 * Never throws – failures resolve to an empty list so one bad provider can't break search.
 */
export async function resilientSearch(provider: PriceProvider, query: string, limit: number): Promise<{ offers: ProviderOffer[]; error?: string }> {
  const health = await getProviderHealth(provider.id);
  if (health.circuitOpenUntil && health.circuitOpenUntil > Date.now()) {
    return { offers: [], error: "circuit_open" };
  }

  const quota = await rateLimit(`provider:${provider.id}`, provider.rateLimitPerMinute, 60);
  if (!quota.ok) {
    logger.warn("providers", "Provider rate limit reached, skipping", { provider: provider.id });
    return { offers: [], error: "rate_limited" };
  }

  const maxAttempts = env.PROVIDER_MAX_RETRIES + 1;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.PROVIDER_TIMEOUT_MS);
    const started = Date.now();
    try {
      const offers = await provider.search(query, { limit, signal: controller.signal });
      clearTimeout(timer);
      await recordResult(provider.id, true, Date.now() - started);
      return { offers };
    } catch (err) {
      clearTimeout(timer);
      lastErr = controller.signal.aborted ? new ProviderError(`timeout after ${env.PROVIDER_TIMEOUT_MS}ms`) : err;
      const message = (lastErr as Error).message;
      await recordResult(provider.id, false, Date.now() - started, message, (lastErr as ProviderError).status);
      if (attempt >= maxAttempts || !isRetryable(lastErr)) break;
      const backoff = Math.random() * Math.min(4000, 300 * 2 ** (attempt - 1));
      await sleep(backoff);
    }
  }
  logger.warn("providers", "Provider search failed", { provider: provider.id, query, error: (lastErr as Error)?.message });
  return { offers: [], error: (lastErr as Error)?.message };
}

/** Thin fetch wrapper that turns non-2xx responses into `ProviderError`s. */
export async function fetchJson<T>(url: string, init: RequestInit & { signal: AbortSignal }): Promise<T> {
  const res = await fetch(url, { ...init, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  return (await res.json()) as T;
}
