/** Locales supported by ShopBonus API (Accept-Language / user.locale). */
export const LOCALES = ["nl", "en"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "nl";

export const LOCALE_LABELS: Record<Locale, string> = {
  nl: "Nederlands",
  en: "English",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function normalizeLocale(value: unknown, fallback: Locale = DEFAULT_LOCALE): Locale {
  if (typeof value !== "string") return fallback;
  const short = value.toLowerCase().split(/[-_]/)[0];
  return isLocale(short) ? short : fallback;
}
