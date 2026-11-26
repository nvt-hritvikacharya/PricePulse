/**
 * Triggers an alert-check run against a running instance:
 *   APP_URL=http://localhost:3000 CRON_SECRET=... npm run alerts:check
 * (Kept as an HTTP call so it reuses the app's providers, cache and notification setup.)
 */
const url = `${process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/cron/check-alerts`;

async function main() {
  const res = await fetch(url, { method: "POST", headers: { Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}` } });
  const body = await res.text();
  console.log(res.status, body);
  if (!res.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
