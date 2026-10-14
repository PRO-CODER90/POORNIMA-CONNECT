import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Google Identity Services (the "Continue with Google" button) needs the origins below.
// 'unsafe-inline' is required by Next.js's inline bootstrap scripts until nonces are adopted;
// dev additionally needs eval/websockets for hot reload.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://accounts.google.com/gsi/client`,
  "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style",
  "font-src 'self' data:",
  "img-src 'self' data: https:",
  `connect-src 'self' https://accounts.google.com/gsi/${isDev ? " ws:" : ""}`,
  "frame-src https://accounts.google.com/gsi/",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          // No "preload": that is a long-lived commitment for the whole domain; add it deliberately later.
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Keeps the Google sign-in popup working while isolating the page from other windows.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
      // The emailed one-time links land on "/": never cache that page.
      { source: "/", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
