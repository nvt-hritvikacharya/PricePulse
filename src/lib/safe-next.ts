/**
 * Returns `next` only when it is a path on this site ("/search?q=x"); anything that could leave
 * the origin ("//evil.com", "/\\evil.com", "https://…", "javascript:…") falls back to `fallback`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/home"): string {
  if (!next || next.length > 2000 || !next.startsWith("/") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  try {
    const base = "http://same-origin.invalid";
    const url = new URL(next, base);
    if (url.origin !== base || next.startsWith("//")) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
