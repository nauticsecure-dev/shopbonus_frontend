import { apiUrl, env } from "@/config/env";
import { getSupportToken } from "@/lib/supportSession";
import { DEFAULT_LOCALE, normalizeLocale, type Locale } from "@/types/locale";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  locale?: Locale;
  body?: unknown;
  /** Absolute or path under the Laravel host. */
  path: string;
  signal?: AbortSignal;
}

function csrfCookieName(): string {
  return "XSRF-TOKEN";
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Fetch the Laravel Sanctum CSRF cookie before cookie-authenticated mutations.
 * Safe to call repeatedly; no-ops when cookie auth is disabled.
 */
let csrfBootstrap: Promise<void> | null = null;

export async function ensureCsrfCookie(force = false): Promise<void> {
  if (!env.useCookieAuth || typeof window === "undefined") return;
  if (csrfBootstrap) return csrfBootstrap;
  if (!force && readCookie(csrfCookieName())) return;
  csrfBootstrap = (async () => {
    const response = await fetch(apiUrl("/sanctum/csrf-cookie"), {
      method: "GET",
      credentials: "include",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      throw new ApiError("Could not initialize the secure session. Please try again.", response.status, "csrf_initialization_failed");
    }
    if (!readCookie(csrfCookieName())) {
      throw new ApiError("The secure session cookie is unavailable. Check the cookie domain and API settings, then try again.", 419, "csrf_cookie_unavailable");
    }
  })();
  try {
    await csrfBootstrap;
  } finally {
    csrfBootstrap = null;
  }
}

/**
 * Typed JSON client for `/api/v1/*`.
 * Always sends Accept-Language so SetRequestLocale can recognize NL/EN.
 */
export async function apiRequest<T = unknown>({
  path,
  locale,
  body,
  headers,
  method = "GET",
  ...rest
}: ApiRequestOptions): Promise<T> {
  const resolvedLocale = normalizeLocale(locale, DEFAULT_LOCALE);
  const upper = (method ?? "GET").toUpperCase();
  const mutating = !["GET", "HEAD", "OPTIONS"].includes(upper);

  // Support sessions must send Bearer alone — cookie + token → 400 ambiguous_credentials.
  const supportToken = getSupportToken();
  const useCookies = env.useCookieAuth && !supportToken;
  // Establish one anonymous session before parallel initial reads as well as
  // writes; competing Set-Cookie responses can otherwise replace a new login.
  if (useCookies) {
    await ensureCsrfCookie();
  }
  const xsrf = useCookies ? readCookie(csrfCookieName()) : null;
  const multipart = typeof FormData !== "undefined" && body instanceof FormData;
  const requestHeaders: HeadersInit = {
    Accept: "application/json",
    "Accept-Language": resolvedLocale,
    ...(body !== undefined && !multipart ? { "Content-Type": "application/json" } : {}),
    ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
    ...(supportToken ? { Authorization: `Bearer ${supportToken}` } : {}),
    ...headers,
  };

  const doFetch = async (headersForAttempt: HeadersInit) =>
    fetch(path.startsWith("http") ? path : apiUrl(path), {
      method: upper,
      credentials: supportToken ? "omit" : useCookies ? "include" : "same-origin",
      headers: headersForAttempt,
      body: body === undefined ? undefined : multipart ? body as FormData : JSON.stringify(body),
      ...rest,
    });

  let response = await doFetch(requestHeaders);

  // Recover from expired CSRF: refresh cookie once and retry the mutation.
  if (response.status === 419 && mutating && useCookies) {
    await ensureCsrfCookie(true);
    const retryXsrf = readCookie(csrfCookieName());
    response = await doFetch({
      ...requestHeaders,
      ...(retryXsrf ? { "X-XSRF-TOKEN": retryXsrf } : {}),
    });
  }

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = text;
    }
  }

  if (!response.ok) {
    if (typeof window !== "undefined" && /\/api\/v1\/workspaces\//.test(path) && [403, 404].includes(response.status)) {
      window.dispatchEvent(new Event("shopbonus:workspace-access-check"));
    }
    const payload = parsed as { message?: string; error?: { code?: string; message?: string } } | null;
    const message =
      payload?.error?.message ||
      payload?.message ||
      `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload?.error?.code, parsed);
  }

  return parsed as T;
}

/**
 * Multipart upload (avatar, etc.). Does not set Content-Type so the browser
 * can attach the multipart boundary. Reuses CSRF/cookie handling from apiRequest.
 */
export async function apiUpload<T = unknown>({
  path,
  locale,
  formData,
  method = "POST",
  signal,
}: {
  path: string;
  locale?: Locale;
  formData: FormData;
  method?: "POST" | "PUT" | "PATCH";
  signal?: AbortSignal;
}): Promise<T> {
  return apiRequest<T>({ path, locale, method, body: formData, signal });
}
