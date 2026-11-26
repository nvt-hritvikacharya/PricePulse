import "server-only";
import { z } from "zod";

/**
 * Validated server-side environment. Everything integration-related is optional so the
 * app boots in demo mode with zero configuration; only DATABASE_URL is required at runtime.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  SESSION_SECRET: z.string().optional(),
  SESSION_IDLE_MINUTES: z.coerce.number().int().positive().default(30),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  // Runtime (non-inlined) aliases, so hosts that can't set NEXT_PUBLIC_* at build time still work.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  ENABLE_GOOGLE_AUTH: z.string().optional(),
  AMAZON_PAAPI_ACCESS_KEY: z.string().optional(),
  AMAZON_PAAPI_SECRET_KEY: z.string().optional(),
  AMAZON_PAAPI_PARTNER_TAG: z.string().optional(),
  AMAZON_PAAPI_HOST: z.string().default("webservices.amazon.in"),
  AMAZON_PAAPI_REGION: z.string().default("eu-west-1"),
  FLIPKART_AFFILIATE_ID: z.string().optional(),
  FLIPKART_AFFILIATE_TOKEN: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),
  MOCK_PROVIDER: z.enum(["auto", "always", "never"]).default("auto"),
  PROVIDER_TIMEOUT_MS: z.coerce.number().int().positive().default(8000),
  PROVIDER_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
  SEARCH_CACHE_TTL: z.coerce.number().int().positive().default(900),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().default("https://api.openai.com/v1"),
  LLM_MODEL: z.string().default("gpt-4o-mini"),
  SMTP_URL: z.string().optional(),
  EMAIL_FROM: z.string().default("PricePulse India <alerts@pricepulse.in>"),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:alerts@pricepulse.in"),
  CRON_SECRET: z.string().optional(),
});

// Treat empty strings as "unset" so `.env.example` can be copied verbatim.
const raw = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

export const env = schema.parse(raw);

export const supabaseUrl = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
export const supabaseAnonKey = env.SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isGoogleAuthEnabled =
  isSupabaseConfigured && (env.ENABLE_GOOGLE_AUTH ?? process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH) === "true";

export const vapidPublicKey = env.VAPID_PUBLIC_KEY ?? env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
