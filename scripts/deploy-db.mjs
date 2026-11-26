// Runs at the end of `npm run build`: applies Prisma migrations, the idempotent seed and the
// product-photo warm-up against the host-provided database. Skips when DATABASE_URL is unset.
import { execFileSync } from "node:child_process";

const url = process.env.DATABASE_URL?.trim() ?? "";
if (url === "") {
  console.log("deploy-db: DATABASE_URL not set, skipping migrations and seed");
  process.exit(0);
}

// Migrations take an advisory lock, which needs a direct (non-pooled) connection.
const direct = process.env.DATABASE_URL_UNPOOLED?.trim() || url;
const run = (bin, args, databaseUrl) =>
  execFileSync(`node_modules/.bin/${bin}`, args, { stdio: "inherit", env: { ...process.env, DATABASE_URL: databaseUrl } });

run("prisma", ["migrate", "deploy"], direct);
if (process.env.SKIP_SEED !== "true") run("tsx", ["prisma/seed.ts"], direct);
run("tsx", ["scripts/warm-images.ts"], url);
