import type { NextConfig } from "next";

// All /api/* calls are proxied to the PHP backend so the session cookie is
// set on this site's own domain (no cross-site cookies, no CORS).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8111";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_URL.replace(/\/$/, "")}/api/:path*` }];
  },
};

export default nextConfig;
