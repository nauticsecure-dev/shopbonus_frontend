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

/**
 * Consent-aware allowlisted script loader. Only loads scripts whose tracker
 * key was returned by the API — never pastes arbitrary code.
 */
export function applyAllowedTrackers(allowed: string[]): void {
  if (typeof window === "undefined") return;
  window.__shopbonusAnalyticsAllowed = analyticsAllowed(allowed);
  window.__shopbonusAllowedTrackers = allowed;
  document.querySelectorAll<HTMLScriptElement>("script[data-consent-tracker]").forEach((el) => {
    const key = el.dataset.consentTracker;
    if (!key) return;
    if (allowed.includes(key)) {
      if (el.dataset.consentLoaded === "1") return;
      const src = el.dataset.src;
      if (src) {
        el.src = src;
        el.dataset.consentLoaded = "1";
      }
    } else if (el.dataset.consentLoaded === "1") {
      el.remove();
    }
  });
  if (!analyticsAllowed(allowed)) {
    clearOptionalStorage();
  }
}

/** Best-effort clear of controlled optional client storage after withdraw/reject. */
export function clearOptionalStorage(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("_ga") || k.startsWith("_gid") || k.startsWith("sb_mkt_"))) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
}

declare global {
  interface Window {
    __shopbonusAnalyticsAllowed?: boolean;
    __shopbonusAllowedTrackers?: string[];
  }
}
