import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger";

/** Error type that maps cleanly onto an HTTP response. */
export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "error") {
    super(message);
  }
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Wraps a route handler with uniform error handling + JSON error envelopes. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: { code: "validation_error", message: err.issues[0]?.message ?? "Invalid input", issues: err.issues } },
          { status: 400 },
        );
      }
      logger.error("api", "Unhandled route error", { error: (err as Error).message, stack: (err as Error).stack });
      return NextResponse.json({ error: { code: "internal", message: "Something went wrong" } }, { status: 500 });
    }
  };
}
