/** Format Laravel minor units (cents) as Dutch euro, e.g. 1220 → €12,20 */
export function formatMinor(minor: number, currency = "EUR"): string {
  const amount = (Number(minor) || 0) / 100;
  if (currency === "EUR") {
    return (
      "€" +
      amount.toLocaleString("nl-NL", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }
  return amount.toLocaleString("nl-NL", {
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
export function formatNlDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
}
