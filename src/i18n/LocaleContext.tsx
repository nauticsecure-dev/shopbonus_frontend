"use client";

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
  normalizeLocale,
  type Locale,
} from "@/types/locale";

const STORAGE_KEY = "shopbonus-locale";

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

function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = [
    ...(navigator.languages ?? []),
    navigator.language,
  ].filter(Boolean);
  for (const candidate of candidates) {
    const normalized = normalizeLocale(candidate, DEFAULT_LOCALE);
    if (isLocale(normalized) && candidate.toLowerCase().startsWith(normalized)) {
      return normalized;
    }
  }
  return DEFAULT_LOCALE;
}

function readStoredLocale(): Locale | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isLocale(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  const [accountSynced, setAccountSynced] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readStoredLocale();
      setLocaleState(stored ?? detectBrowserLocale());
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale;
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    if (!isLocale(next)) return;
    setLocaleState(next);
    setAccountSynced(true);
  }, []);

  const applyAccountLocale = useCallback(
    (value: string | null | undefined) => {
      if (!ready || accountSynced) return;
      if (!isLocale(value)) return;
      const stored = readStoredLocale();
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
