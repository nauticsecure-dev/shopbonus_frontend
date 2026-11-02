"use client";

import { useRouter } from "next/navigation";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDictionary, type Dictionary } from "@/i18n/dictionaries";
import {
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
} from "@/types/locale";

const STORAGE_KEY = "shopbonus-locale";
const EXPLICIT_KEY = "shopbonus-locale-explicit";

interface LocaleState {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
  /** Apply account preference once after login without fighting an explicit visitor choice. */
  applyAccountLocale: (locale: string | null | undefined) => void;
  /** BCP-47 tag for Intl / toLocaleString */
  intlLocale: string;
}

const Ctx = createContext<LocaleState | null>(null);

function readStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE }: { children: React.ReactNode; initialLocale?: Locale }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [ready, setReady] = useState(false);
  const [accountSynced, setAccountSynced] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readStoredLocale();
      setLocaleState(stored ?? initialLocale);
      setReady(true);
    });
  }, [initialLocale]);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale;
    document.cookie = `shopbonus-locale=${locale}; Path=/; SameSite=Lax; Max-Age=31536000`;
    router.refresh();
  }, [locale, ready, router]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    try {
      localStorage.setItem(STORAGE_KEY, next);
      localStorage.setItem(EXPLICIT_KEY, "1");
    } catch { /* storage can be unavailable */ }
    setLocaleState(next);
    setAccountSynced(true);
  }, []);

  const applyAccountLocale = useCallback(
    (value: string | null | undefined) => {
      if (!ready || accountSynced) return;
      if (!isLocale(value)) return;
      let explicit = false;
      try { explicit = localStorage.getItem(EXPLICIT_KEY) === "1"; } catch { /* ignore */ }
      const stored = explicit ? readStoredLocale() : null;
      // Prefer explicit localStorage choice; otherwise hydrate from /me.
      if (stored) {
        setAccountSynced(true);
        return;
      }
      setLocaleState(value);
      setAccountSynced(true);
    },
    [ready, accountSynced]
  );

  const value = useMemo<LocaleState>(
    () => ({
      locale,
      dictionary: getDictionary(locale),
      setLocale,
      applyAccountLocale,
      intlLocale: locale === "nl" ? "nl-NL" : "en-GB",
    }),
    [locale, setLocale, applyAccountLocale]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
