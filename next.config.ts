import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const CANONICAL_HOST = "yagw.app";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // Production only: preview deployments must keep working on their own vercel.app URLs.
    if (process.env.VERCEL_ENV !== "production") return [];
    // Everything except the cron endpoint, which Vercel calls on the deployment URL.
    const source = "/:path((?!api/cron).*)";
    const destination = `https://${CANONICAL_HOST}/:path`;
    return [
      { source, has: [{ type: "host", value: "(?<sub>.+)\\.vercel\\.app" }], destination, permanent: true },
      { source, has: [{ type: "host", value: `www.${CANONICAL_HOST}` }], destination, permanent: true },
    ];
  },
};

export default nextConfig;
