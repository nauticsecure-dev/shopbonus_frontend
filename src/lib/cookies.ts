import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";

const STORAGE_KEY = "shopbonus-cookie-consent-id";
const SETTINGS_EVENT = "shopbonus:cookie-settings";

export type CookiePolicy = {
  version: string | null;
  requires_reconsent: boolean;
  texts: {
    title: string;
    body: string;
    accept_all: string;
    reject_optional: string;
    customize: string;
  } | null;
  categories: Array<{
    key: string;
    required: boolean;
    trackers: Array<{ key: string; name: string; provider: string; purpose: string; retention: string }>;
  }>;
};

export type CookieConsentRecord = {
  consent_id: string;
  policy_version: string;
  action: string;
  choices: Record<string, boolean>;
  recorded_at: string;
  allowed_trackers?: string[];
  needs_renewal?: boolean;
};

type Data<T> = { data: T };

export function readStoredConsentId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeConsentId(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function clearConsentId(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Footer / settings: reopen the banner and allow withdraw/change. */
export function openCookieSettings(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT));
}

export function onCookieSettingsRequest(handler: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  const listener = () => handler();
  window.addEventListener(SETTINGS_EVENT, listener);
  return () => window.removeEventListener(SETTINGS_EVENT, listener);
}

export async function fetchCookiePolicy(locale: Locale): Promise<CookiePolicy> {
  const res = await apiRequest<Data<CookiePolicy>>({
    path: `/api/v1/public/cookie-policy?locale=${encodeURIComponent(locale)}`,
    cache: "no-store",
    locale,
  });
  return res.data;
}

export async function recordCookieConsent(body: {
  consent_id?: string | null;
  policy_version: string;
  action: "accept_all" | "reject_optional" | "customize" | "withdraw";
  choices?: { preferences?: boolean; analytics?: boolean; marketing?: boolean };
  locale?: Locale;
}): Promise<CookieConsentRecord> {
  const { locale, ...payload } = body;
  const res = await apiRequest<Data<CookieConsentRecord>>({
    path: "/api/v1/public/cookie-consents",
    method: "POST",
    body: payload,
    locale,
  });
  storeConsentId(res.data.consent_id);
  applyAllowedTrackers(res.data.allowed_trackers ?? []);
  return res.data;
}

export async function fetchCookieConsent(consentId: string, locale?: Locale): Promise<CookieConsentRecord> {
  const res = await apiRequest<Data<CookieConsentRecord>>({
    path: `/api/v1/public/cookie-consents/${encodeURIComponent(consentId)}`,
    locale,
  });
  return res.data;
}

/** True when analytics/marketing trackers may run. */
export function analyticsAllowed(allowed?: string[] | null): boolean {
  if (!allowed || allowed.length === 0) return false;
  return allowed.some((t) => t !== "session");
}

/** Optional SDKs register an actual shutdown hook (listeners, timers, queued work). */
export type TrackerLifecycle = {
  enable?: () => void;
  disable: () => void;
  cookiePrefixes?: string[];
  storagePrefixes?: string[];
};
const lifecycles = new Map<string, TrackerLifecycle>();
export function registerConsentTracker(key: string, lifecycle: TrackerLifecycle): () => void {
  lifecycles.set(key, lifecycle);
  if (!window.__shopbonusAllowedTrackers?.includes(key)) lifecycle.disable();
  return () => { lifecycle.disable(); lifecycles.delete(key); };
}

/** Apply permission before notifying SDKs; reload a running script without a shutdown contract. */
export function applyAllowedTrackers(allowed: string[]): void {
  if (typeof window === "undefined") return;
  const previous = window.__shopbonusAllowedTrackers ?? [];
  window.ShopBonusConsent = { getConsentId: readStoredConsentId };
  window.__shopbonusAnalyticsAllowed = analyticsAllowed(allowed);
  window.__shopbonusAllowedTrackers = [...allowed];
  let reload = false;
  const revoked = new Set(previous.filter((key) => !allowed.includes(key)));
  document.querySelectorAll<HTMLScriptElement>("script[data-consent-tracker]").forEach((el) => {
    const key = el.dataset.consentTracker;
    if (key && !allowed.includes(key) && el.dataset.consentLoaded === "1") revoked.add(key);
  });
  for (const key of revoked) {
    const lifecycle = lifecycles.get(key);
    try { lifecycle?.disable(); } catch { reload = true; }
    clearOptionalStorage(lifecycle?.storagePrefixes, lifecycle?.cookiePrefixes);
    // Removing a tag cannot terminate JavaScript. A fresh document terminates the old SDK.
    if (!lifecycle) reload = true;
  }
  for (const [key, lifecycle] of lifecycles) {
    if (allowed.includes(key) && !previous.includes(key)) lifecycle.enable?.();
  }
  document.querySelectorAll<HTMLScriptElement>("script[data-consent-tracker]").forEach((el) => {
    const key = el.dataset.consentTracker;
    if (!key) return;
    if (allowed.includes(key)) {
      if (el.dataset.consentLoaded === "1") return;
      const src = el.dataset.src;
      if (src) { el.src = src; el.dataset.consentLoaded = "1"; }
    } else if (el.dataset.consentLoaded === "1" && !lifecycles.has(key)) {
      el.removeAttribute("src");
      delete el.dataset.consentLoaded;
    }
  });
  if (revoked.size || !analyticsAllowed(allowed)) clearOptionalStorage();
  window.dispatchEvent(new CustomEvent("shopbonus:consent-changed"));
  if (reload) window.location.reload();
}

const optionalPrefixes = ["_ga", "_gid", "_gat", "_gcl_", "_fbp", "_fbc", "sb_mkt_"];
/** Clear controlled optional cookies at host/parent-domain and path scopes, plus browser storage. */
export function clearOptionalStorage(storagePrefixes = optionalPrefixes, cookiePrefixes = optionalPrefixes): void {
  for (const storage of [() => localStorage, () => sessionStorage]) {
    try {
      const target = storage();
      const keys = Array.from({ length: target.length }, (_, i) => target.key(i));
      keys.forEach((key) => { if (key && storagePrefixes.some((prefix) => key.startsWith(prefix))) target.removeItem(key); });
    } catch { /* storage may be blocked */ }
  }
  const domains = ["", ...location.hostname.split(".").map((_, i, parts) => parts.slice(i).join(".")).filter((domain) => domain.includes("."))];
  const paths = ["/", ...location.pathname.split("/").map((_, i, parts) => parts.slice(0, i + 1).join("/")).filter(Boolean)];
  document.cookie.split(";").forEach((cookie) => {
    const name = cookie.split("=")[0].trim();
    if (!cookiePrefixes.some((prefix) => name.startsWith(prefix))) return;
    for (const domain of domains) for (const path of paths) {
      document.cookie = `${name}=; Max-Age=0; Path=${path};${domain ? ` Domain=${domain};` : ""} SameSite=Lax`;
    }
  });
}

declare global {
  interface Window {
    __shopbonusAnalyticsAllowed?: boolean;
    __shopbonusAllowedTrackers?: string[];
    ShopBonusConsent?: { getConsentId: () => string | null };
  }
}
