/**
 * Seed script: `npm run db:seed`
 *  - admin + demo users (sign in with the dev OTP when Supabase isn't configured)
 *  - the full demo catalogue with per-retailer offers and 90 days of price history
 *  - sample search history, wishlist, alerts, recently viewed, notifications and logs
 * Safe to re-run: catalogue rows are upserted, sample activity is only created once.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { MOCK_CATALOG } from "../src/server/providers/mock/catalog";
import { mockHistory, offerFor, productSlug, retailersFor } from "../src/server/providers/mock/pricing";
import { buildReviewSummary } from "../src/server/pricing/review-summary";
import { retailerSearchUrl } from "../src/features/retailers/retailers";
import { slugify } from "../src/lib/utils";

const db = new PrismaClient();
const DAY = 86_400_000;

async function seedUsers() {
  const admin = await db.user.upsert({
    where: { email: "admin@pricepulse.dev" },
    create: { email: "admin@pricepulse.dev", name: "Aditi Admin", role: "ADMIN", authMethod: "DEV", notificationPreference: { create: {} } },
    update: { role: "ADMIN" },
  });
  const demo = await db.user.upsert({
    where: { email: "demo@pricepulse.dev" },
    create: { email: "demo@pricepulse.dev", phone: "+919876543210", name: "Rahul Sharma", authMethod: "DEV", notificationPreference: { create: {} } },
    update: {},
  });
  // A spread of historical sign-ups so the admin charts have shape.
  const names = ["Priya Iyer", "Arjun Mehta", "Sneha Reddy", "Vikram Singh", "Ananya Gupta", "Karan Patel", "Meera Nair", "Rohan Das", "Ishita Joshi", "Aman Verma"];
  const methods = ["EMAIL_OTP", "PHONE_OTP", "GOOGLE"] as const;
  for (const [i, name] of names.entries()) {
    const email = `${slugify(name).replace(/-/g, ".")}@example.in`;
    await db.user.upsert({
      where: { email },
      create: {
        email,
        name,
        authMethod: methods[i % 3],
        createdAt: new Date(Date.now() - (i * 2.7 + 1) * DAY),
        lastActiveAt: new Date(Date.now() - (i % 4) * DAY),
        notificationPreference: { create: {} },
      },
      update: {},
    });
  }
  return { admin, demo };
}

async function seedCatalog() {
  const products: { id: string; key: string; name: string; best: number }[] = [];
  for (const item of MOCK_CATALOG) {
    const matchKey = `mock:${item.key}`;
    const retailers = retailersFor(item);
    const offers = retailers.map((r) => offerFor(item, r));
    const product = await db.product.upsert({
      where: { matchKey },
      create: {
        matchKey,
        slug: productSlug(slugify(item.name), matchKey),
        name: item.name,
        brand: item.brand,
        category: item.category,
        imageUrl: `/api/img/${item.key}`,
        description: item.description,
        specs: item.specs,
        reviewSummary: buildReviewSummary(matchKey, offers),
        releasedAt: new Date(Date.now() - item.launchedDaysAgo * DAY),
        isMock: true,
        viewCount: Math.floor(Math.random() * 120),
        compareCount: Math.floor(Math.random() * 80),
      },
      update: {},
    });

    for (const o of offers) {
      const data = {
        providerId: "mock",
        externalId: `${item.key}@${o.retailer}`,
        title: item.name,
        url: retailerSearchUrl(o.retailer, item.name),
        imageUrl: `/api/img/${item.key}`,
        price: o.price,
        mrp: o.mrp,
        deliveryCharge: o.deliveryCharge,
        deliveryEtaDays: o.deliveryEtaDays,
        sellerName: o.sellerName,
        sellerRating: o.sellerRating,
        ratingCount: o.ratingCount,
        availability: o.availability,
        isMock: true,
      };
      await db.offer.upsert({
        where: { productId_retailer: { productId: product.id, retailer: o.retailer } },
        create: { productId: product.id, retailer: o.retailer, ...data },
        update: data,
      });
    }

    const hasHistory = await db.priceSnapshot.count({ where: { productId: product.id } });
    if (!hasHistory) {
      const rows: Prisma.PriceSnapshotCreateManyInput[] = offers.flatMap((o) => [
        ...mockHistory(item.key, o.retailer, o.price).map(({ day, price }) => ({
          productId: product.id,
          retailer: o.retailer,
          price,
          mrp: o.mrp,
          capturedAt: new Date(day * DAY + 10 * 3_600_000),
          isMock: true,
        })),
        { productId: product.id, retailer: o.retailer, price: o.price, mrp: o.mrp, isMock: true },
      ]);
      await db.priceSnapshot.createMany({ data: rows });
    }
    products.push({ id: product.id, key: item.key, name: item.name, best: Math.min(...offers.map((o) => o.price)) });
  }
  return products;
}

async function seedActivity(userId: string, adminId: string, products: { id: string; key: string; name: string; best: number }[]) {
  if (await db.searchHistory.count()) return;
  const queries = ["iphone 16", "samsung galaxy s25 ultra", "sony wh-1000xm5", "macbook air m4", "running shoes", "air fryer", "smart tv", "amul butter", "niacinamide serum", "levis jeans", "oneplus 13", "earbuds"];
  const users = await db.user.findMany({ select: { id: true } });
  const rows: Prisma.SearchHistoryCreateManyInput[] = [];
  for (let i = 0; i < 260; i++) {
    const q = queries[Math.floor(Math.pow(Math.random(), 1.6) * queries.length)];
    rows.push({
      userId: users[i % users.length].id,
      query: q,
      normalized: q,
      resultCount: 5 + Math.floor(Math.random() * 30),
      durationMs: 180 + Math.floor(Math.random() * 600),
      createdAt: new Date(Date.now() - Math.random() * 30 * DAY),
    });
  }
  await db.searchHistory.createMany({ data: rows });

  const pick = (key: string) => products.find((p) => p.key === key)!;
  const iphone = pick("apple-iphone-16-128gb");
  const sony = pick("sony-wh-1000xm5");
  const fryer = pick("philips-air-fryer-hd9252");
  const nike = pick("nike-air-zoom-pegasus-41");

  await db.wishlist.createMany({ data: [iphone, sony, nike].map((p) => ({ userId, productId: p.id })), skipDuplicates: true });
  await db.favoriteProduct.createMany({ data: [{ userId, productId: sony.id }], skipDuplicates: true });
  await db.recentlyViewed.createMany({
    data: [iphone, sony, fryer, nike].map((p, i) => ({ userId, productId: p.id, viewedAt: new Date(Date.now() - i * 3_600_000) })),
    skipDuplicates: true,
  });
  await db.priceAlert.createMany({
    data: [
      { userId, productId: iphone.id, targetPrice: Math.round(iphone.best * 0.92) },
      { userId, productId: sony.id, targetPrice: Math.round(sony.best * 0.95), retailer: "amazon" },
      { userId: adminId, productId: fryer.id, targetPrice: Math.round(fryer.best * 0.9) },
    ],
  });
  await db.notification.create({
    data: { userId, title: "Welcome to PricePulse India 🎉", body: "Set a price alert on any product and we'll tell you when it drops.", url: "/alerts", channels: ["in_app"] },
  });
  await db.appLog.createMany({
    data: [
      { level: "INFO", scope: "seed", message: "Database seeded with demo catalogue", context: { products: products.length } },
      { level: "WARN", scope: "providers", message: "No real provider keys configured – using mock provider" },
    ],
  });
}

async function main() {
  const { admin, demo } = await seedUsers();
  const products = await seedCatalog();
  await seedActivity(demo.id, admin.id, products);
  console.log(`Seeded ${products.length} products, users: admin@pricepulse.dev (ADMIN), demo@pricepulse.dev`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
