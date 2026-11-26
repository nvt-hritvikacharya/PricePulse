import { db } from "@/lib/db";
import { kv } from "@/lib/redis";

/** Liveness/readiness probe used by Docker healthcheck. */
export async function GET() {
  const checks: Record<string, string> = {};
  try {
    await db.$queryRaw`SELECT 1`;
    checks.database = "ok";
  } catch {
    checks.database = "down";
  }
  try {
    await kv.set("health:ping", "1", 10);
    checks.cache = kv.backend;
  } catch {
    checks.cache = "down";
  }
  const ok = checks.database === "ok";
  return Response.json({ ok, checks, time: new Date().toISOString() }, { status: ok ? 200 : 503 });
}
