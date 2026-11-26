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
