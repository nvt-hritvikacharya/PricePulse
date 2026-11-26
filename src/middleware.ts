import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/features/auth/cookie";

/**
 * Edge gate:
 *  - Cross-site requests that change state (non-GET /api calls from another origin) are refused.
 *  - Visitors without a session cookie are sent to /login (API calls get a 401).
 * The token itself (signature, idle expiry, revocation, admin role) is verified on the server by
 * `getCurrentUser()` / `requireUser()` in every protected layout and API route.
 */
const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/api/auth/signin", "/api/auth/signup", "/api/auth/logout", "/api/img", "/api/cron", "/api/health"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function isCrossSite(req: NextRequest): boolean {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host !== (req.headers.get("x-forwarded-host") ?? req.headers.get("host"));
  } catch {
    return true;
  }
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/") && !SAFE_METHODS.has(req.method) && !pathname.startsWith("/api/cron/") && isCrossSite(req)) {
    return NextResponse.json({ error: { code: "cross_site", message: "Cross-site request refused" } }, { status: 403 });
  }

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (isPublic || req.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Session expired" } }, { status: 401 });
  }
  const url = new URL("/login", req.url);
  if (pathname !== "/" && pathname !== "/home") url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|retailers/).*)"],
};
