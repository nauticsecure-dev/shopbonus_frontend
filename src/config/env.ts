/**
 * Public frontend env. Only NEXT_PUBLIC_* values are exposed to the browser.
 * Never put API secrets, Sanctum private keys, or DB credentials here.
 */

// Next.js only inlines NEXT_PUBLIC_* into browser bundles for static
// `process.env.NAME` references, so each value is read by name here and
// never via `process.env[name]` (which is empty in the browser).
function readPublic(value: string | undefined, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export const env = {
  /** Laravel API origin, e.g. http://localhost:8010 (ShopBonus local artisan serve). */
  apiBaseUrl: readPublic(process.env.NEXT_PUBLIC_API_BASE_URL, "http://localhost:8010"),
  /** Site origin used for absolute links (optional). */
  appUrl: readPublic(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
  /** When true, cookie/Sanctum SPA mode is expected. */
  useCookieAuth: readPublic(process.env.NEXT_PUBLIC_USE_COOKIE_AUTH, "true") === "true",
  /** Laravel Reverb public key (optional — wallet still refreshes over HTTP). */
  reverbKey: readPublic(process.env.NEXT_PUBLIC_REVERB_APP_KEY),
  reverbHost: readPublic(process.env.NEXT_PUBLIC_REVERB_HOST, "127.0.0.1"),
  reverbPort: Number(readPublic(process.env.NEXT_PUBLIC_REVERB_PORT, "8080")) || 8080,
  reverbScheme: readPublic(process.env.NEXT_PUBLIC_REVERB_SCHEME, "http"),
} as const;

export function apiUrl(path: string): string {
  const base = env.apiBaseUrl.replace(/\/$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  return `${base}${suffix}`;
}
