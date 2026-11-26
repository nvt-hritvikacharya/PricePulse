/**
 * Retailer catalogue (client-safe). Logos are rendered as branded monogram badges
 * (see `RetailerLogo`) rather than shipping trademarked artwork.
 */
export const RETAILERS = {
  amazon: { id: "amazon", name: "Amazon", domain: "amazon.in", color: "#FF9900", text: "#111827", mono: "a", kind: "marketplace" },
  flipkart: { id: "flipkart", name: "Flipkart", domain: "flipkart.com", color: "#2874F0", text: "#FFE500", mono: "F", kind: "marketplace" },
  myntra: { id: "myntra", name: "Myntra", domain: "myntra.com", color: "#FF3F6C", text: "#FFFFFF", mono: "M", kind: "fashion" },
  ajio: { id: "ajio", name: "AJIO", domain: "ajio.com", color: "#2C4152", text: "#FFFFFF", mono: "AJ", kind: "fashion" },
  croma: { id: "croma", name: "Croma", domain: "croma.com", color: "#00A99D", text: "#FFFFFF", mono: "C", kind: "electronics" },
  reliance: { id: "reliance", name: "Reliance Digital", domain: "reliancedigital.in", color: "#E42529", text: "#FFFFFF", mono: "RD", kind: "electronics" },
  tatacliq: { id: "tatacliq", name: "Tata CLiQ", domain: "tatacliq.com", color: "#1F1F1F", text: "#FFFFFF", mono: "TC", kind: "marketplace" },
  nykaa: { id: "nykaa", name: "Nykaa", domain: "nykaa.com", color: "#FC2779", text: "#FFFFFF", mono: "N", kind: "beauty" },
  vijaysales: { id: "vijaysales", name: "Vijay Sales", domain: "vijaysales.com", color: "#E31E24", text: "#FFFFFF", mono: "VS", kind: "electronics" },
  jiomart: { id: "jiomart", name: "JioMart", domain: "jiomart.com", color: "#0078AD", text: "#FFFFFF", mono: "J", kind: "grocery" },
  blinkit: { id: "blinkit", name: "Blinkit", domain: "blinkit.com", color: "#F8CB46", text: "#0C831F", mono: "b", kind: "quick" },
  zepto: { id: "zepto", name: "Zepto", domain: "zeptonow.com", color: "#5A1E96", text: "#FFFFFF", mono: "Z", kind: "quick" },
  bigbasket: { id: "bigbasket", name: "BigBasket", domain: "bigbasket.com", color: "#84C225", text: "#FFFFFF", mono: "bb", kind: "grocery" },
} as const;

export type RetailerId = keyof typeof RETAILERS;
export type Retailer = (typeof RETAILERS)[RetailerId];

export const RETAILER_IDS = Object.keys(RETAILERS) as RetailerId[];

export function getRetailer(id: string): Retailer | undefined {
  return RETAILERS[id as RetailerId];
}

/** Maps a free-text merchant name (e.g. Google Shopping "source") onto a known retailer. */
export function matchRetailer(source: string | undefined | null): RetailerId | undefined {
  if (!source) return undefined;
  const s = source.toLowerCase().replace(/[^a-z]/g, "");
  const rules: [RegExp, RetailerId][] = [
    [/amazon/, "amazon"],
    [/flipkart/, "flipkart"],
    [/myntra/, "myntra"],
    [/ajio/, "ajio"],
    [/croma/, "croma"],
    [/reliancedigital|reliance/, "reliance"],
    [/tatacliq|cliq/, "tatacliq"],
    [/nykaa/, "nykaa"],
    [/vijaysales/, "vijaysales"],
    [/jiomart/, "jiomart"],
    [/blinkit|grofers/, "blinkit"],
    [/zepto/, "zepto"],
    [/bigbasket/, "bigbasket"],
  ];
  return rules.find(([re]) => re.test(s))?.[1];
}

/** Shortens a catalogue title to what shoppers type ("Apple iPhone 16 (128 GB) – Ultramarine" → "Apple iPhone 16 128 GB"). */
export function retailerSearchQuery(productName: string): string {
  return productName.split(/\s[–—]\s/)[0].replace(/[()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Deep link to the retailer's own search results for a product. */
export function retailerSearchUrl(retailer: RetailerId, productName: string): string {
  const q = retailerSearchQuery(productName);
  const e = encodeURIComponent(q);
  switch (retailer) {
    case "amazon": return `https://www.amazon.in/s?k=${e}`;
    case "flipkart": return `https://www.flipkart.com/search?q=${e}`;
    case "myntra": return `https://www.myntra.com/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}?rawQuery=${e}`;
    case "ajio": return `https://www.ajio.com/search/?text=${e}`;
    case "croma": return `https://www.croma.com/searchB?q=${e}%3Arelevance&text=${e}`;
    case "reliance": return `https://www.reliancedigital.in/products?q=${e}`;
    case "tatacliq": return `https://www.tatacliq.com/search/?searchCategory=all&text=${e}`;
    case "nykaa": return `https://www.nykaa.com/search/result/?q=${e}`;
    case "vijaysales": return `https://www.vijaysales.com/search-listing?q=${e}`;
    case "jiomart": return `https://www.jiomart.com/search/${e}`;
    case "blinkit": return `https://blinkit.com/s/?q=${e}`;
    case "zepto": return `https://www.zeptonow.com/search?query=${e}`;
    case "bigbasket": return `https://www.bigbasket.com/ps/?q=${e}`;
  }
}
