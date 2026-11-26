import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
];

const nextConfig: NextConfig = {
  // Docker builds set NEXT_OUTPUT=standalone for a minimal runtime image; `next start` uses the default.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  poweredByHeader: false,
  // Hosted builds run as a public demo until Supabase is configured; the Docker image
  // (standalone output) keeps the dev OTP off unless ALLOW_DEV_AUTH_IN_PRODUCTION=true.
  env: { DEV_AUTH_PRODUCTION_DEFAULT: process.env.NEXT_OUTPUT === "standalone" ? "false" : "true" },
  reactStrictMode: true,
  serverExternalPackages: ["ioredis", "web-push", "nodemailer"],
  images: {
    // Retailer/aggregator CDNs vary per provider, so allow any https host.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
