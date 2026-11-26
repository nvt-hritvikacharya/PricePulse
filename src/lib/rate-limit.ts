import "server-only";
import { kv } from "./redis";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetSeconds: number;
}

/**
 * Fixed-window rate limiter on top of Redis INCR + EXPIRE.
 * Good enough for API abuse protection and provider quota shaping.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const window = Math.floor(Date.now() / 1000 / windowSeconds);
  const key = `rl:${bucket}:${window}`;
  const count = await kv.incr(key, windowSeconds);
  const resetSeconds = windowSeconds - (Math.floor(Date.now() / 1000) % windowSeconds);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetSeconds };
}

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
