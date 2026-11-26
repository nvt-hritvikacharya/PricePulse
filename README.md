# PricePulse India

Compare prices for the same product across **Amazon, Flipkart, Myntra, AJIO, Croma, Reliance Digital, Tata CLiQ, Nykaa, Vijay Sales, JioMart, Blinkit, Zepto and BigBasket**, with 30/90-day price history, email and web-push price-drop alerts, an AI buy/wait recommendation, and an admin panel.

The app runs with **zero API keys**. When no price provider is configured, a deterministic **mock provider** supplies realistic Indian prices. That data is labelled **“Demo data”** everywhere it appears. Add keys and the real adapters take over.

---

## Contents

1. [Quick start (local)](#quick-start-local)
2. [Quick start (Docker)](#quick-start-docker)
3. [What works without keys / what needs keys](#what-works-without-keys--what-needs-keys)
4. [Architecture](#architecture)
5. [Price providers](#price-providers)
6. [Authentication & sessions](#authentication--sessions)
7. [Price alerts & notifications](#price-alerts--notifications)
8. [AI recommendation](#ai-recommendation)
9. [Admin panel](#admin-panel)
10. [Data model](#data-model)
11. [Scripts](#scripts)
12. [Environment variables](#environment-variables)
13. [Production checklist](#production-checklist)

---

## Quick start (local)

Requirements: Node 20+ (tested on 22), PostgreSQL 14+, and Redis 6+. Redis is optional: without it the app falls back to an in-process cache.

```bash
cp .env.example .env            # defaults work for local Postgres/Redis
npm install
npx prisma migrate deploy       # or: npm run db:migrate:dev
npm run db:seed                 # demo catalogue, 90-day history, users, sample activity
npm run dev                     # http://localhost:3000
```

**Sign up / sign in:** open the app and use **Sign up** with an email ID and password, or a mobile number and a 6-digit passcode (plus name, date of birth and gender). **Sign in** uses the same email + password or mobile + passcode.

| Seeded account | Role | Notes |
|---|---|---|
| `admin@pricepulse.dev` | ADMIN | Sample data only (no password, so it can't sign in) |
| `demo@pricepulse.dev` / `9876543210` | USER | Sample wishlist, alerts and recently viewed items (no password) |

To open `/admin`, sign up normally and then run `npm run admin:grant -- you@example.com` (or a mobile number). `npm run admin:revoke -- …` removes it. Admin rights never come from an email or phone number, because sign-up doesn't prove you own either.

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build       # http://localhost:3000
```

Compose starts the following services:

- **postgres** (16)
- **redis** (7, LRU, AOF)
- **migrate**, a one-shot job that runs `prisma migrate deploy` and the seed
- **app**, the Next.js standalone server with a health check on `/api/health`
- **alerts-cron**, which calls `/api/cron/check-alerts` every 30 minutes

`NEXT_PUBLIC_*` variables are inlined at build time. Compose passes them as build args from your `.env`, so rebuild after changing them.

## What works without keys / what needs keys

| Feature | Without keys | Needs |
|---|---|---|
| Sign up / sign in (email + password, mobile + passcode) | Works | — |
| Google login | Hidden | Supabase keys + Google provider enabled in Supabase + `ENABLE_GOOGLE_AUTH=true` |
| Real product photos | Generated artwork | `SERPAPI_IMAGES_API_KEY` (SerpApi free plan) |
| Search, comparison, sorting, filters | Mock provider (labelled demo data) | Any provider key below for live prices |
| Amazon live prices | — | `AMAZON_PAAPI_ACCESS_KEY`, `AMAZON_PAAPI_SECRET_KEY`, `AMAZON_PAAPI_PARTNER_TAG` |
| Flipkart live prices | — | `FLIPKART_AFFILIATE_ID`, `FLIPKART_AFFILIATE_TOKEN` |
| Myntra, AJIO, Croma, Reliance Digital, Tata CLiQ, Nykaa, Vijay Sales, JioMart, Blinkit, Zepto, BigBasket | — | `SERPAPI_API_KEY` (Google Shopping, `gl=in`) |
| Price history charts | Seeded 90-day history plus snapshots from every search | — |
| AI recommendation | Rule-based engine (transparent, labelled “Smart rules”) | `LLM_API_KEY` (+ optional `LLM_BASE_URL`, `LLM_MODEL`) for any OpenAI-compatible API |
| Email alerts | Written to the in-app inbox + server log | `SMTP_URL` |
| Web push alerts | “Enable push” explains it isn't configured | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` (`npm run vapid:generate`) |
| Redis cache / rate limiting | In-memory fallback (single instance) | `REDIS_URL` |

## Architecture

```
src/
├─ app/                         # Next.js App Router
│  ├─ (auth)/login              # first screen – sign up / sign in (password or passcode; optional Google)
│  ├─ (app)/                    # authenticated shell (header, session guard)
│  │  ├─ home, search, product/[slug], alerts, wishlist, profile
│  │  └─ admin/                 # dashboard, users, searches, products, health, logs
│  ├─ api/                      # route handlers (thin – call into src/server)
│  ├─ auth/callback             # Supabase OAuth (PKCE) callback
│  ├─ error.tsx, global-error.tsx, not-found.tsx, loading.tsx files
│  └─ robots.ts, sitemap.ts, manifest.ts
├─ features/                    # feature-based UI + client logic
│  ├─ auth/  search/  products/  alerts/  profile/  admin/  retailers/
├─ server/                      # server-only domain logic
│  ├─ providers/                # ★ pluggable price-provider layer
│  │  ├─ types.ts               #   PriceProvider interface + ProviderOffer
│  │  ├─ registry.ts            #   provider list, activation rules, demo mode
│  │  ├─ resilient.ts           #   rate limit, retries, timeout, circuit breaker, health
│  │  ├─ adapters/              #   amazon-paapi, flipkart-affiliate, serpapi-shopping, mock
│  │  └─ mock/                  #   demo catalogue + deterministic pricing engine
│  ├─ pricing/                  # matcher, search service, catalog store, product service
│  ├─ notifications/            # alert checker, email (SMTP), web push (VAPID)
│  ├─ ai/                       # LLM recommendation with rule-based fallback
│  └─ admin/                    # analytics queries
├─ components/ui/               # shadcn/ui-style primitives (Radix + Tailwind)
├─ lib/                         # env, db, redis (+fallback), rate-limit, logger, api helpers
├─ stores/                      # Zustand (search prefs, session window)
└─ middleware.ts                # auth gate (edge, JWT verify)
```

**Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui-style components on Radix, Framer Motion, TanStack Query, Zustand, Recharts, Prisma + PostgreSQL, Redis (ioredis), Supabase Auth, Docker.

**Rendering:** product pages, admin pages and layouts are **server components** that read the database directly. They render SEO metadata and Product JSON-LD on the server. Interactive pieces are client islands that fetch through TanStack Query: search, charts, alerts, wishlist and the session guard. Every route segment that loads data has a `loading.tsx` skeleton. Error boundaries exist at the segment and global level.

### Search flow

1. `GET /api/search?q=&sort=` checks auth and the per-user rate limit (30/min).
2. `searchPrices()` looks up the Redis cache, keyed by the normalised query and the active provider set (TTL `SEARCH_CACHE_TTL`, default 15 min).
3. On a cache miss, every active provider is queried **in parallel** through `resilientSearch()`.
4. `groupOffers()` merges offers for the same product across retailers. It compares normalised token sets with Jaccard similarity and keeps the cheapest offer per retailer.
5. `persistGroups()` upserts `Product` and `Offer` rows and writes a `PriceSnapshot` (at most one per product, retailer and hour). Those snapshots become the price history. Demo products also get a 90-day synthetic backfill.
6. Results are sorted after the cache: lowest landed price (including delivery), highest discount, fastest delivery, highest rating, or newest. Out-of-stock offers always go last. Price alerts for the affected products are evaluated in the background.

## Price providers

None of these retailers offers an open public price API, and **this project does not scrape**. All live data comes from official or commercial APIs:

| Adapter | API | Retailers |
|---|---|---|
| `amazon-paapi` | [Amazon Product Advertising API 5.0](https://webservices.amazon.com/paapi5/documentation/) `SearchItems`, AWS SigV4-signed, marketplace `www.amazon.in` | Amazon |
| `flipkart-affiliate` | [Flipkart Affiliate API](https://affiliate.flipkart.com/api-docs/) search feed | Flipkart |
| `serpapi-google-shopping` | [SerpApi Google Shopping](https://serpapi.com/google-shopping-api) (`gl=in`, `location=India`) | Myntra, AJIO, Croma, Reliance Digital, Tata CLiQ, Nykaa, Vijay Sales, JioMart, Blinkit, Zepto, BigBasket (+ Amazon/Flipkart when their own keys are missing) |
| `mock` | Built-in deterministic demo market | All 13 |

`MOCK_PROVIDER` controls the mock provider:

- `auto` (default): used only when no real provider has keys.
- `always`: blended in with real providers.
- `never`: disabled.

### Resilience (applies uniformly to every adapter)

- **Rate limiting**: a per-provider fixed window in Redis (`rateLimitPerMinute`), plus per-user API limits.
- **Caching**: search results are cached in Redis, as are autocomplete, popular searches and LLM answers.
- **Retries**: exponential backoff with full jitter (`PROVIDER_MAX_RETRIES`). 4xx responses other than 429 are not retried.
- **Timeouts**: each attempt is aborted after `PROVIDER_TIMEOUT_MS`.
- **Circuit breaker**: after 5 consecutive failures the provider is skipped for 60 s.
- **Health tracking**: calls, failures, EMA latency, last error and status (healthy, degraded, down, idle) are kept in Redis. Every call is also logged to `provider_calls`. Both appear under **Admin → API health**.
- One failing provider never breaks a search. It shows up in the “Data sources” panel under the results.

### Adding a provider

1. Create `src/server/providers/adapters/<name>.ts` that implements `PriceProvider` and returns normalised `ProviderOffer`s.
2. Add it to `ALL_PROVIDERS` in `registry.ts`.
3. Document its env vars in `.env.example`.

## Authentication & sessions

- **Sign up** takes an email ID + password (8+ characters, with a letter and a number) or a mobile number + 6-digit passcode, plus name, date of birth (13+) and gender. The other identifier is optional. **Sign in** uses the same credentials; an account with both an email and a mobile can sign in with either. Indian numbers are normalised to `+91XXXXXXXXXX`.
- Passwords and passcodes are stored as salted **scrypt** hashes (`src/lib/passwords.ts`). Five wrong attempts lock the account for 15 minutes, and sign-up and sign-in are also rate-limited per IP and per identifier.
- Changing the email or mobile in **Profile** requires the current password or passcode. **Profile → Change password/passcode** signs out the account's other sessions.
- **Admin rights** are granted only with `npm run admin:grant` and removed with `npm run admin:revoke`. The role is read from the database on every request, so revoking takes effect immediately.
- Sessions are signed with `SESSION_SECRET` if set, otherwise with a random 256-bit key generated once and stored in the `app_secrets` table.
- Middleware refuses cross-site state-changing API requests (`Sec-Fetch-Site` / `Origin` check). The post-login `next` redirect only accepts paths on this site.
- **Google sign-in** is optional, through Supabase OAuth (PKCE via `/auth/callback`; `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ENABLE_GOOGLE_AUTH=true`). It never takes over an existing password account with the same email.
- **Every login is recorded** as a row in the `sessions` table: user, sign-in method, device (user agent), IP, start time, last activity, and how it ended (logout or idle timeout). Users see their own history under **Profile → Login sessions** and can sign out other devices. Admins see all sessions under **Admin → Sessions**. The session cookie is an httpOnly HS256 JWT bound to that row, so sessions can be revoked.
- **30-minute inactivity timeout:** the token's `exp` is `lastActivity + SESSION_IDLE_MINUTES` (default 30).
  - Interactions (pointer, key, scroll, touch) are throttled to one call every 30 s to `POST /api/auth/activity`. That call slides the window forward in both the cookie and the DB.
  - Background polling does **not** extend the session; only real interaction does.
  - Two minutes before expiry a toast offers “Stay signed in”. When the window lapses the client signs out and redirects to `/login?reason=expired`.
  - Middleware (edge) rejects expired tokens: page requests are redirected to `/login` and API calls get a 401. Server code also validates the DB session.
- **Logout** revokes the DB session and clears the cookie.

## Product images & store links

- Demo catalogue products start with generated artwork. Set `SERPAPI_IMAGES_API_KEY` ([SerpApi Google Images](https://serpapi.com/google-images-api); the free plan gives 250 searches a month) and each product gets a real photo from Google Images, preferring retailer and brand CDNs.
  - The deploy step (`scripts/warm-images.ts`) fetches photos for the whole catalogue once. Products added later are looked up on their first search or view.
  - Each photo is saved on the product, so it's never looked up again. A search that finds nothing usable isn't repeated for 30 days.
  - Lookups stop at `IMAGE_LOOKUPS_PER_MONTH` (default 200) and are recorded in `provider_calls`, so the app stays inside the free plan. After an error (wrong key, outage), lookups pause for 10 minutes.
  - Use the separate `SERPAPI_IMAGES_API_KEY` rather than `SERPAPI_API_KEY`: the latter also turns on live Google Shopping prices, which spend a search on every user search.
  - Google's own Custom Search JSON API is closed to new customers and shuts down on 1 January 2027, so it isn't used.
- Products from real price APIs (Amazon PA-API, Flipkart, SerpApi Shopping) use the image those APIs return.
- Images load directly from their source in the browser; the server never proxies third-party image URLs.
- **Buy** buttons on demo offers open the retailer's own search results for the product (for example `amazon.in/s?k=…`). Real offers link to the product page the API returned.

## Price alerts & notifications

- From any product page, “Price alert” lets you set a target price, optionally a specific store, and choose email and/or push. Re-submitting for the same product and store updates the existing alert.
- **When alerts are checked:**
  - right after you create one, so it fires immediately if the target is already met;
  - after every fresh (uncached) search for the affected products;
  - when a scheduler calls `POST /api/cron/check-alerts` with `Authorization: Bearer $CRON_SECRET`. That call refreshes prices for watched products first. Compose runs it every 30 min, or run `npm run alerts:check` yourself.
- **Delivery:**
  - Every triggered alert lands in the in-app inbox (bell icon and the Alerts page).
  - Email goes out through SMTP (`SMTP_URL`). Without SMTP the email is logged instead.
  - Web push uses VAPID and the service worker at `public/sw.js`. Expired subscriptions are pruned.
- A user is not re-notified for 24 h unless the price drops further. Per-user preferences cover email, push, weekly digest, drops-only and minimum drop percentage.

## AI recommendation

`server/ai/recommendation.ts` produces a verdict (**Buy now / Good deal / Wait / Caution**), a headline and reasons that cite rupee figures.

- **LLM:** any OpenAI-compatible `/chat/completions` endpoint (OpenAI, OpenRouter, Groq, Azure gateways, Ollama). The model receives the offers, 90-day stats and the review summary, must return JSON, and the output is validated with zod. Answers are cached for 6 h per product and price.
- **Fallback:** a deterministic rules engine runs when no key is set or the LLM call fails. It looks at where the current price sits in the 90-day low–high range, the gap to the average, the spread across stores, and ratings. The UI labels which engine produced the answer.

## Admin panel

`/admin` is restricted to `role = ADMIN`.

| Page | What it shows |
|---|---|
| **Dashboard** | KPIs (users, active users, searches, tracked products, alerts, errors) and 30-day charts for searches and sign-ups |
| **Users** | DAU chart, sign-in method split, recent users with activity |
| **Searches** | Top queries, volume, average latency and results, zero-result queries, live feed |
| **Products** | Most viewed, most compared, most watched (by alerts) |
| **API health** | Live provider status, quotas, success rate, latency, last error, cache backend, recent calls |
| **Logs** | Structured application logs (`app_logs`), filterable by level |

## Data model

Defined in `prisma/schema.prisma` (migration in `prisma/migrations`).

- **Required tables:** `users`, `search_history`, `wishlist`, `price_alerts`, `recently_viewed`, `favorite_products`, `notification_preferences`.
- **Supporting tables:**
  - `products`: canonical product with `matchKey`, specs, review summary and view/compare counters
  - `offers`: latest offer per product and retailer
  - `price_snapshots`: price history
  - `sessions`, `push_subscriptions`, `notifications` (inbox)
  - `provider_calls`: API health
  - `app_logs`

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (next/core-web-vitals + TypeScript) |
| `npm test` | Unit tests (node:test via tsx): matcher, pricing, search relevance, validation |
| `npm run db:migrate` / `db:migrate:dev` | Apply / create migrations |
| `npm run db:seed` | Seed demo data (idempotent) |
| `npm run alerts:check` | Trigger an alert check on a running instance |
| `npm run vapid:generate` | Generate web-push VAPID keys |

## Environment variables

Every variable is documented inline in [`.env.example`](.env.example). Empty values count as unset, so the file can be copied verbatim.

## Publishing on Cursor

The repo is set up for Cursor's app hosting:

- `cursor-app.json` asks the host for a Postgres database; the host sets `DATABASE_URL` for build and runtime.
- `npm run build` ends with `scripts/deploy-db.mjs`, which runs `prisma migrate deploy` and the idempotent seed against that database (skipped when `DATABASE_URL` is unset; set `SKIP_SEED=true` to skip only the seed).
- Redis is optional. Without `REDIS_URL` the cache and rate limiter are in-process (per instance).
- Secrets (image search, price-provider keys, `LLM_API_KEY`, `SMTP_URL`, VAPID, `CRON_SECRET`, `SESSION_SECRET`, optional Supabase for Google) are set as app secrets on the host. Use the runtime names `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ENABLE_GOOGLE_AUTH` and `VAPID_PUBLIC_KEY`, since `NEXT_PUBLIC_*` values are inlined at build time.

## Production checklist

- [ ] Set a strong `SESSION_SECRET` (≥ 32 chars) and a strong `CRON_SECRET`.
- [ ] Grant yourself admin with `npm run admin:grant -- <your email>` (against the production `DATABASE_URL`).
- [ ] Optional: Supabase Google OAuth with redirect URL `https://<your-domain>/auth/callback`.
- [ ] Optional: `SERPAPI_IMAGES_API_KEY` for real product photos (SerpApi free plan).
- [ ] Add at least one price-provider key and set `MOCK_PROVIDER=never` to hide demo data.
- [ ] Configure `SMTP_URL` and VAPID keys for alerts.
- [ ] Point `REDIS_URL` at a managed Redis. It is required for correct rate limiting across multiple instances.
- [ ] Schedule `POST /api/cron/check-alerts`.
- [ ] Review retailer and affiliate terms: product links should carry your affiliate tags, and pricing disclaimers are shown in the footer.
