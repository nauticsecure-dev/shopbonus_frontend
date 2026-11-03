/** Format Laravel minor units (cents); defaults to Dutch formatting, e.g. 1220 → €12,20. */
export function formatMinor(minor: number, currency = "EUR", locale = "nl-NL"): string {
  const amount = (Number(minor) || 0) / 100;
  if (currency === "EUR" && locale === "nl-NL") {
    return (
      "€" +
      amount.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return amount.toLocaleString(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function minorToMajor(minor: number): number {
  return Math.round((Number(minor) || 0)) / 100;
}

export function majorToMinor(major: number): number {
  return Math.round((Number(major) || 0) * 100);
}

/** Localized short date from ISO string. */
export function formatNlDate(iso: string | null | undefined, locale = "nl-NL"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}
