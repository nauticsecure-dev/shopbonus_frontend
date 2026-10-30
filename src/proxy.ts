import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Network-boundary hardening for ShopBonus.
 * In development, skip CSP so Turbopack HMR / PostCSS child processes are not blocked.
 */
export function proxy(_request: NextRequest) {
  const response = NextResponse.next();
  const isProd = process.env.NODE_ENV === "production";

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (!isProd) {
    return response;
  }

  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  const api = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8010";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' ${api}`,
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
