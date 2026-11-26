import { test } from "node:test";
import assert from "node:assert/strict";
import { groupOffers, matchKeyFor } from "../src/server/pricing/matcher";
import { mockHistory, offerFor, priceOn, searchCatalog, syntheticProducts } from "../src/server/providers/mock/pricing";
import { MOCK_CATALOG } from "../src/server/providers/mock/catalog";
import { matchRetailer, retailerSearchQuery, retailerSearchUrl } from "../src/features/retailers/retailers";
import { signinSchema, signupSchema } from "../src/features/auth/schemas";
import { hashSecret, verifySecret } from "../src/lib/passwords";
import { safeNextPath } from "../src/lib/safe-next";
import { parseSerpApiImages, pickImage } from "../src/server/images/image-search";
import { imageSearchKey, monthlyImageBudget } from "../src/server/images/serpapi-images";
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

test("sign-in schema normalises Indian phone numbers", () => {
  const r = signinSchema.parse({ method: "phone", phone: "98765 43210", secret: "123456" });
  assert.equal(r.method === "phone" && r.phone, "+919876543210");
  assert.equal(signinSchema.safeParse({ method: "phone", phone: "12345", secret: "123456" }).success, false);
});

test("formatting helpers", () => {
  assert.equal(discountPercent(750, 1000), 25);
  assert.equal(discountPercent(1000, 900), 0);
  assert.match(formatINR(129999), /1,29,999/);
});

test("sign-up: email + strong password, or mobile + 6-digit passcode, plus a plausible DOB", () => {
  const base = { name: " Priya Sharma ", dateOfBirth: "1995-04-12", gender: "female" };
  const e = signupSchema.parse({ ...base, method: "email", email: "Priya@Example.com", phone: "", secret: "shop4deals" });
  assert.equal(e.name, "Priya Sharma");
  assert.equal(e.email, "priya@example.com");
  assert.equal(e.phone, undefined);
  const p = signupSchema.parse({ ...base, method: "phone", phone: "98765 43210", email: "", secret: "482913" });
  assert.equal(p.phone, "+919876543210");
  assert.equal(signupSchema.safeParse({ ...base, method: "email", email: "a@b.in", secret: "short1" }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, method: "email", email: "a@b.in", secret: "onlyletters" }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, method: "phone", phone: "9876543210", secret: "12345" }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, method: "phone", phone: "9876543210", secret: "abcdef" }).success, false);
  const thisYear = new Date().getUTCFullYear();
  assert.equal(signupSchema.safeParse({ ...base, dateOfBirth: `${thisYear - 5}-01-01`, method: "phone", phone: "9876543210", secret: "482913" }).success, false);
  assert.equal(signupSchema.safeParse({ ...base, gender: "other", method: "phone", phone: "9876543210", secret: "482913" }).success, false);
});

test("passwords are salted scrypt hashes and verify only the right secret", async () => {
  const h1 = await hashSecret("shop4deals");
  const h2 = await hashSecret("shop4deals");
  assert.notEqual(h1, h2);
  assert.match(h1, /^scrypt\$16384\$8\$1\$/);
  assert.equal(await verifySecret("shop4deals", h1), true);
  assert.equal(await verifySecret("shop4deal", h1), false);
  assert.equal(await verifySecret("anything", null), false);
});

test("next redirects stay on this site", () => {
  assert.equal(safeNextPath("/search?q=iphone#top"), "/search?q=iphone#top");
  for (const bad of ["//evil.com", "/\\evil.com", "/\\/evil.com", "https://evil.com", "javascript:alert(1)", "/%0d%0aSet-Cookie:x", "/\tevil", "", null, undefined]) {
    const out = safeNextPath(bad as string);
    assert.ok(out === "/home" || (out.startsWith("/") && !out.startsWith("//")), `unsafe: ${String(bad)} -> ${out}`);
  }
  assert.equal(safeNextPath("//evil.com"), "/home");
  assert.equal(safeNextPath("/\\evil.com"), "/home");
});

test("retailer deep links search the retailer site for the product", () => {
  assert.equal(retailerSearchQuery("Apple iPhone 16 (128 GB) – Ultramarine"), "Apple iPhone 16 128 GB");
  assert.equal(retailerSearchUrl("amazon", "Sony WH-1000XM5"), "https://www.amazon.in/s?k=Sony%20WH-1000XM5");
  assert.equal(retailerSearchUrl("flipkart", "Sony WH-1000XM5"), "https://www.flipkart.com/search?q=Sony%20WH-1000XM5");
  assert.match(retailerSearchUrl("myntra", "Levi's 511 Jeans"), /^https:\/\/www\.myntra\.com\/levi's-511-jeans\?rawQuery=/);
});

test("image search prefers large https photos from retailer CDNs", () => {
  const results = parseSerpApiImages({
    images_results: [
      { original: "http://insecure.example/a.jpg", original_width: 800, original_height: 800 },
      { original: "https://blog.example/tiny.jpg", original_width: 120, original_height: 90 },
      { original: "https://x.example/logo.svg" },
      { original: "https://cdn.example/photo.jpg", original_width: 900, original_height: 700 },
      { original: "https://m.media-amazon.com/images/I/61abc.jpg", original_width: 1000, original_height: 1000 },
      { thumbnail: "https://encrypted-tbn0.gstatic.com/x" },
    ],
  });
  assert.equal(results.length, 5);
  assert.equal(pickImage(results), "https://m.media-amazon.com/images/I/61abc.jpg");
  assert.equal(pickImage(results.slice(0, 4)), "https://cdn.example/photo.jpg");
  assert.equal(pickImage(parseSerpApiImages({})), null);
});

test("image lookups use a dedicated key when set and stay inside the free plan by default", () => {
  assert.equal(imageSearchKey({ SERPAPI_IMAGES_API_KEY: "img", SERPAPI_API_KEY: "shop" }), "img");
  assert.equal(imageSearchKey({ SERPAPI_API_KEY: "shop" }), "shop");
  assert.equal(imageSearchKey({}), undefined);
  assert.equal(monthlyImageBudget({}), 200);
  assert.equal(monthlyImageBudget({ IMAGE_LOOKUPS_PER_MONTH: "50" }), 50);
});
