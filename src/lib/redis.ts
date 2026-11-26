import "server-only";
import Redis from "ioredis";
import { env } from "./env";

/**
 * Minimal key-value surface used by the app. Backed by Redis when REDIS_URL is reachable,
 * otherwise by an in-process Map so local dev and tests keep working (single instance only).
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, ttlSeconds: number): Promise<number>;
  hgetall(key: string): Promise<Record<string, string>>;
  hset(key: string, values: Record<string, string | number>): Promise<void>;
  hincrby(key: string, field: string, by: number): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  readonly backend: "redis" | "memory";
}

class MemoryKV implements KV {
  readonly backend = "memory" as const;
  private store = new Map<string, { v: string; exp?: number }>();
  private hashes = new Map<string, Record<string, string>>();

  private alive(key: string) {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.exp && e.exp < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }
  async get(key: string) {
    return this.alive(key)?.v ?? null;
  }
  async set(key: string, value: string, ttl?: number) {
    this.store.set(key, { v: value, exp: ttl ? Date.now() + ttl * 1000 : undefined });
  }
  async del(key: string) {
    this.store.delete(key);
    this.hashes.delete(key);
  }
  async incr(key: string, ttl: number) {
    const e = this.alive(key);
    const n = (e ? Number(e.v) : 0) + 1;
    this.store.set(key, { v: String(n), exp: e?.exp ?? Date.now() + ttl * 1000 });
    return n;
  }
  async hgetall(key: string) {
    return { ...(this.hashes.get(key) ?? {}) };
  }
  async hset(key: string, values: Record<string, string | number>) {
    const h = this.hashes.get(key) ?? {};
    for (const [k, v] of Object.entries(values)) h[k] = String(v);
    this.hashes.set(key, h);
  }
  async hincrby(key: string, field: string, by: number) {
    const h = this.hashes.get(key) ?? {};
    const n = Number(h[field] ?? 0) + by;
    h[field] = String(n);
    this.hashes.set(key, h);
    return n;
  }
  async keys(pattern: string) {
    const re = new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
    return [...new Set([...this.store.keys(), ...this.hashes.keys()])].filter((k) => re.test(k));
  }
}

class RedisKV implements KV {
  readonly backend = "redis" as const;
  constructor(private client: Redis) {}
  async get(key: string) {
    return this.client.get(key);
  }
  async set(key: string, value: string, ttl?: number) {
    if (ttl) await this.client.set(key, value, "EX", ttl);
    else await this.client.set(key, value);
  }
  async del(key: string) {
    await this.client.del(key);
  }
  async incr(key: string, ttl: number) {
    const [[, n]] = (await this.client.multi().incr(key).expire(key, ttl, "NX").exec()) as [[unknown, number]];
    return n;
  }
  async hgetall(key: string) {
    return this.client.hgetall(key);
  }
  async hset(key: string, values: Record<string, string | number>) {
    await this.client.hset(key, values);
  }
  async hincrby(key: string, field: string, by: number) {
    return this.client.hincrby(key, field, by);
  }
  async keys(pattern: string) {
    const out: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await this.client.scan(cursor, "MATCH", pattern, "COUNT", 200);
      cursor = next;
      out.push(...batch);
    } while (cursor !== "0");
    return out;
  }
}

/** Wraps Redis and transparently degrades to memory if Redis errors at runtime. */
class ResilientKV implements KV {
  private memory = new MemoryKV();
  private redisDownUntil = 0;
  constructor(private redis: RedisKV | null) {}

  get backend() {
    return this.redis && Date.now() > this.redisDownUntil ? ("redis" as const) : ("memory" as const);
  }

  private async run<T>(fn: (kv: KV) => Promise<T>): Promise<T> {
    if (this.redis && Date.now() > this.redisDownUntil) {
      try {
        return await fn(this.redis);
      } catch (err) {
        console.warn("[redis] falling back to memory cache:", (err as Error).message);
        this.redisDownUntil = Date.now() + 30_000;
      }
    }
    return fn(this.memory);
  }
  get(k: string) { return this.run((kv) => kv.get(k)); }
  set(k: string, v: string, t?: number) { return this.run((kv) => kv.set(k, v, t)); }
  del(k: string) { return this.run((kv) => kv.del(k)); }
  incr(k: string, t: number) { return this.run((kv) => kv.incr(k, t)); }
  hgetall(k: string) { return this.run((kv) => kv.hgetall(k)); }
  hset(k: string, v: Record<string, string | number>) { return this.run((kv) => kv.hset(k, v)); }
  hincrby(k: string, f: string, b: number) { return this.run((kv) => kv.hincrby(k, f, b)); }
  keys(p: string) { return this.run((kv) => kv.keys(p)); }
}

const globalForKV = globalThis as unknown as { kv?: ResilientKV };

function createKV(): ResilientKV {
  if (!env.REDIS_URL) return new ResilientKV(null);
  const client = new Redis(env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy: (times) => Math.min(times * 500, 10_000),
  });
  client.on("error", () => {
    /* surfaced through ResilientKV fallback; avoid log spam */
  });
  return new ResilientKV(new RedisKV(client));
}

export const kv: KV = globalForKV.kv ?? (globalForKV.kv = createKV());

/** JSON cache helper: returns cached value or computes, stores and returns it. */
export async function cached<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const hit = await kv.get(key);
  if (hit) {
    try {
      return { value: JSON.parse(hit) as T, hit: true };
    } catch {
      /* corrupted entry: recompute */
    }
  }
  const value = await compute();
  await kv.set(key, JSON.stringify(value), ttlSeconds);
  return { value, hit: false };
}
