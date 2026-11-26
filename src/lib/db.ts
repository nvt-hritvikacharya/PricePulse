import "server-only";
import { PrismaClient } from "@prisma/client";

/** Singleton Prisma client (survives Next.js dev hot reloads). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/** Prisma needs `pgbouncer=true` behind a transaction pooler (no prepared statements). */
function datasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("-pooler") && !url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
    return url.toString();
  } catch {
    return raw;
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: datasourceUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
