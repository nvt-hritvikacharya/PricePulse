import { MOCK_CATALOG, type MockCategory } from "@/server/providers/mock/catalog";
import { hash } from "@/server/providers/mock/pricing";

/**
 * Generated product artwork for demo-mode products (no third-party images are hot-linked).
 * Real providers supply their own CDN image URLs.
 */
const ICONS: Record<MockCategory | "General", string> = {
  Mobiles: '<rect x="150" y="70" width="100" height="190" rx="18" fill="#0f172a" stroke="#fff" stroke-width="6"/><rect x="162" y="88" width="76" height="150" rx="8" fill="url(#s)"/><circle cx="175" cy="105" r="7" fill="#1e293b"/>',
  Laptops: '<rect x="110" y="100" width="180" height="115" rx="10" fill="#0f172a" stroke="#fff" stroke-width="6"/><rect x="122" y="112" width="156" height="91" rx="4" fill="url(#s)"/><path d="M90 225h220l-14 22H104z" fill="#fff"/>',
  Audio: '<path d="M130 190v-30a70 70 0 0 1 140 0v30" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="round"/><rect x="112" y="180" width="40" height="66" rx="14" fill="#0f172a" stroke="#fff" stroke-width="6"/><rect x="248" y="180" width="40" height="66" rx="14" fill="#0f172a" stroke="#fff" stroke-width="6"/>',
  TVs: '<rect x="90" y="85" width="220" height="135" rx="10" fill="#0f172a" stroke="#fff" stroke-width="6"/><rect x="102" y="97" width="196" height="111" rx="4" fill="url(#s)"/><path d="M170 222h60l10 26h-80z" fill="#fff"/>',
  Wearables: '<rect x="170" y="60" width="60" height="50" rx="10" fill="#fff" opacity=".8"/><rect x="170" y="210" width="60" height="50" rx="10" fill="#fff" opacity=".8"/><rect x="145" y="105" width="110" height="110" rx="28" fill="#0f172a" stroke="#fff" stroke-width="6"/><rect x="160" y="120" width="80" height="80" rx="18" fill="url(#s)"/>',
  Appliances: '<rect x="125" y="70" width="150" height="185" rx="20" fill="#0f172a" stroke="#fff" stroke-width="6"/><circle cx="200" cy="175" r="48" fill="url(#s)" stroke="#fff" stroke-width="5"/><circle cx="160" cy="98" r="7" fill="#fff"/><circle cx="182" cy="98" r="7" fill="#fff"/>',
  Fashion: '<path d="M150 80l-60 35 22 45 28-14v104h120V146l28 14 22-45-60-35c-8 18-26 28-50 28s-42-10-50-28z" fill="url(#s)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>',
  Footwear: '<path d="M85 220c0-30 10-70 30-90 20 10 40 30 70 40 40 12 90 18 115 40 10 10 5 30-15 30H105c-12 0-20-8-20-20z" fill="url(#s)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M85 232h230" stroke="#fff" stroke-width="10" stroke-linecap="round"/>',
  Beauty: '<rect x="170" y="70" width="60" height="40" rx="8" fill="#fff"/><rect x="150" y="105" width="100" height="150" rx="24" fill="url(#s)" stroke="#fff" stroke-width="6"/><rect x="170" y="150" width="60" height="50" rx="8" fill="#fff" opacity=".85"/>',
  Grocery: '<path d="M110 120h180l-18 130H128z" fill="url(#s)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/><path d="M160 120c0-30 15-45 40-45s40 15 40 45" fill="none" stroke="#fff" stroke-width="8"/>',
  General: '<rect x="120" y="90" width="160" height="150" rx="22" fill="url(#s)" stroke="#fff" stroke-width="6"/><path d="M120 140h160" stroke="#fff" stroke-width="6"/>',
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function GET(_req: Request, ctx: { params: Promise<{ key: string }> }) {
  const { key } = await ctx.params;
  const product = MOCK_CATALOG.find((p) => p.key === key);
  const category = product?.category ?? "General";
  const h = hash(key) % 360;
  const brand = product?.brand ?? "PricePulse";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 320" width="400" height="320">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},85%,62%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},80%,45%)"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${(h + 180) % 360},90%,70%)"/><stop offset="1" stop-color="hsl(${(h + 220) % 360},85%,55%)"/></linearGradient>
</defs>
<rect width="400" height="320" fill="url(#g)"/>
<circle cx="330" cy="40" r="90" fill="#fff" opacity=".12"/><circle cx="40" cy="300" r="110" fill="#fff" opacity=".08"/>
${ICONS[category]}
<text x="20" y="300" font-family="Inter,Segoe UI,Arial,sans-serif" font-size="20" font-weight="700" fill="#fff" opacity=".9">${esc(brand)}</text>
</svg>`;
  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400, immutable" },
  });
}
