/**
 * Pure helpers for product-image search results (no I/O, unit-tested).
 * Google Programmable Search (searchType=image) and SerpApi Google Images both return
 * candidate images; we prefer large photos hosted on retailer / brand CDNs.
 */
export interface ImageCandidate {
  url: string;
  width?: number;
  height?: number;
}

const PREFERRED_HOSTS = [
  /(^|\.)media-amazon\.com$/,
  /(^|\.)flixcart\.com$/,
  /(^|\.)croma\.com$/,
  /(^|\.)reliancedigital\.in$/,
  /(^|\.)myntassets\.com$/,
  /(^|\.)nykaa(man)?\.com$/,
  /(^|\.)bbassets\.com$/,
  /(^|\.)jiomart\.com$/,
  /(^|\.)apple\.com$/,
  /(^|\.)samsung\.com$/,
];

export const isPlaceholderImage = (url: string | null | undefined) => !url || url.startsWith("/api/img/");

function host(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.hostname : null;
  } catch {
    return null;
  }
}

/** Best candidate: https, not SVG, at least 200px when the size is known; retailer/brand CDNs first. */
export function pickImage(candidates: ImageCandidate[]): string | null {
  const usable = candidates.filter((c) => {
    if (!host(c.url) || /\.svg(\?|$)/i.test(c.url) || c.url.length > 2000) return false;
    return !(c.width && c.height && Math.min(c.width, c.height) < 200);
  });
  const preferred = usable.find((c) => PREFERRED_HOSTS.some((re) => re.test(host(c.url)!)));
  return (preferred ?? usable[0])?.url ?? null;
}

interface GoogleCseResponse {
  items?: { link?: string; image?: { width?: number; height?: number } }[];
}

export function parseGoogleCse(json: unknown): ImageCandidate[] {
  return ((json as GoogleCseResponse).items ?? [])
    .filter((i) => typeof i.link === "string")
    .map((i) => ({ url: i.link!, width: i.image?.width, height: i.image?.height }));
}

interface SerpApiImagesResponse {
  images_results?: { original?: string; original_width?: number; original_height?: number }[];
}

export function parseSerpApiImages(json: unknown): ImageCandidate[] {
  return ((json as SerpApiImagesResponse).images_results ?? [])
    .filter((i) => typeof i.original === "string")
    .map((i) => ({ url: i.original!, width: i.original_width, height: i.original_height }));
}
