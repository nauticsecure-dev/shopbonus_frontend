import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  async rewrites() {
    // Optional same-origin proxy for future API calls without exposing CORS in local demos.
    // Prefer calling NEXT_PUBLIC_API_BASE_URL directly with credentials for Sanctum.
    return [
      {
        source: "/backend/:path*",
        destination: `${apiOrigin}/:path*`,
      },
    ];
  },
};

export default nextConfig;
