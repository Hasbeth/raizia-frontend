import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob:",
  "connect-src 'self' https://*.supabase.co", "worker-src 'self'", "manifest-src 'self'",
  "media-src 'self' blob:", "object-src 'none'", "base-uri 'self'", "frame-src 'self'",
  "frame-ancestors 'none'", "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  devIndicators: false,
  // Next 16.4 también clona el cuerpo de los rewrites externos: 30 MiB + multipart.
  experimental: { proxyClientMaxBodySize: "32mb" },
  async headers() {
    return [
      { source: "/:path*", headers: [
        { key: "Content-Security-Policy", value: csp },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
        { key: "X-Frame-Options", value: "DENY" },
      ] },
      { source: "/sw.js", headers: [
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        { key: "Service-Worker-Allowed", value: "/" },
      ] },
    ];
  },
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
