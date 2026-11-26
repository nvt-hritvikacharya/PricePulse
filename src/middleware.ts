import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/features/auth/session-token";

/**
 * Auth gate. Pages require a valid (non-idle-expired) session cookie, otherwise the user is
 * sent to /login (the app's first screen). API routes return 401 JSON instead of redirects.
 * Full DB-level session validation (revocation) happens in `getCurrentUser()`.
 */
const PUBLIC_PREFIXES = ["/login", "/auth/callback", "/api/auth/otp", "/api/auth/signup", "/api/auth/logout", "/api/img", "/api/cron", "/api/health"];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const claims = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname === "/login" && claims) {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  if (isPublic) return NextResponse.next();

  if (!claims) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: { code: "unauthenticated", message: "Session expired" } }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    if (pathname !== "/" && pathname !== "/home") url.searchParams.set("next", pathname + search);
    if (req.cookies.has(SESSION_COOKIE)) url.searchParams.set("reason", "expired");
    const res = NextResponse.redirect(url);
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (pathname.startsWith("/admin") && claims.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|sw.js|manifest.webmanifest|robots.txt|sitemap.xml|retailers/).*)"],
};
