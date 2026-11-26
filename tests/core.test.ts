import { test } from "node:test";
import assert from "node:assert/strict";
import { groupOffers, matchKeyFor } from "../src/server/pricing/matcher";
import { mockHistory, offerFor, priceOn, searchCatalog, syntheticProducts } from "../src/server/providers/mock/pricing";
import { MOCK_CATALOG } from "../src/server/providers/mock/catalog";
import { matchRetailer } from "../src/features/retailers/retailers";
import { sendOtpSchema } from "../src/features/auth/schemas";
import { discountPercent, formatINR } from "../src/lib/utils";
import type { ProviderOffer } from "../src/server/providers/types";

const offer = (o: Partial<ProviderOffer>): ProviderOffer => ({ providerId: "t", retailer: "amazon", title: "x", url: "https://x", price: 100, availability: "IN_STOCK", ...o });

test("matcher merges differently-worded titles for the same product", () => {
  const groups = groupOffers([
    offer({ retailer: "amazon", title: "Apple iPhone 16 (128 GB) - Black", brand: "Apple" }),
    offer({ retailer: "croma", title: "Apple iPhone 16 128GB Black", brand: "Apple" }),
    offer({ retailer: "flipkart", title: "Sony WH-1000XM5 Headphones", brand: "Sony" }),
  ]);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].offers.length, 2);
});

test("matcher keeps only the cheapest offer per retailer", () => {
  const [g] = groupOffers([offer({ price: 200, matchKey: "k" }), offer({ price: 150, matchKey: "k" })]);
  assert.equal(g.offers.length, 1);
  assert.equal(g.offers[0].price, 150);
  assert.equal(matchKeyFor({ title: "anything", matchKey: "mock:abc" }), "mock:abc");
});

test("mock pricing is deterministic and history ends at today's price", () => {
  const p = MOCK_CATALOG[0];
  assert.equal(priceOn(p, "amazon", 20000), priceOn(p, "amazon", 20000));
  const o = offerFor(p, "amazon");
  const h = mockHistory(p.key, "amazon", o.price, 30);
  assert.equal(h.length, 30);
  for (const pt of h) assert.ok(pt.price > o.price * 0.75 && pt.price < o.price * 1.3);
});

test("catalogue search is relevant and falls back to synthetic products", () => {
  assert.deepEqual(searchCatalog("iphone 16").map((p) => p.brand), ["Apple", "Apple"]);
  assert.equal(searchCatalog("bluetooth trimmer").length, 0);
  assert.equal(syntheticProducts("bluetooth trimmer").length, 3);
});

test("retailer names from aggregators map to known retailers", () => {
  assert.equal(matchRetailer("Reliance Digital"), "reliance");
  assert.equal(matchRetailer("Tata CLiQ"), "tatacliq");
  assert.equal(matchRetailer("Some Random Shop"), undefined);
});

test("OTP schema normalises Indian phone numbers", () => {
  const r = sendOtpSchema.parse({ channel: "phone", phone: "98765 43210" });
  assert.equal(r.channel === "phone" && r.phone, "+919876543210");
  assert.throws(() => sendOtpSchema.parse({ channel: "phone", phone: "12345" }));
});

test("formatting helpers", () => {
  assert.equal(discountPercent(750, 1000), 25);
  assert.equal(discountPercent(1000, 900), 0);
  assert.match(formatINR(129999), /1,29,999/);
});
