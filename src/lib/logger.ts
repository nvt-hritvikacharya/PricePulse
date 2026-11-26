import "server-only";
import type { LogLevel, Prisma } from "@prisma/client";
import { db } from "./db";

/**
 * Structured logger. Everything goes to stdout as JSON; INFO+ events are also persisted to
 * the `app_logs` table (fire-and-forget) so the admin panel can show recent logs.
 */
function write(level: LogLevel, scope: string, message: string, context?: Record<string, unknown>) {
  const line = { ts: new Date().toISOString(), level, scope, message, ...(context ?? {}) };
  const out = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  out(JSON.stringify(line));
  if (level === "DEBUG") return;
  db.appLog
    .create({ data: { level, scope, message, context: (context ?? undefined) as Prisma.InputJsonValue | undefined } })
    .catch(() => {
      /* logging must never break a request */
    });
}

export const logger = {
  debug: (scope: string, msg: string, ctx?: Record<string, unknown>) => write("DEBUG", scope, msg, ctx),
  info: (scope: string, msg: string, ctx?: Record<string, unknown>) => write("INFO", scope, msg, ctx),
  warn: (scope: string, msg: string, ctx?: Record<string, unknown>) => write("WARN", scope, msg, ctx),
  error: (scope: string, msg: string, ctx?: Record<string, unknown>) => write("ERROR", scope, msg, ctx),
};
