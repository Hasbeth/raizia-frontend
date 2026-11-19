import type { NextConfig } from "next";

const backendUrl = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  devIndicators: false,
  // Next 16.4 también clona el cuerpo de los rewrites externos: 30 MiB + multipart.
  experimental: { proxyClientMaxBodySize: "32mb" },
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
