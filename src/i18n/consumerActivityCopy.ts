import type { Locale } from "@/types/locale";

// Presentation only: approval and settlement remain distinct from wallet posting.
const statuses: Record<Locale, Record<string, string>> = {
  nl: {
    pending: "In behandeling", approved: "Goedgekeurd", rejected: "Afgewezen",
    reversed: "Teruggedraaid", tracked: "Geregistreerd", credited: "Verwerkt",
    posted: "Verwerkt", reserved: "Gereserveerd", released: "Vrijgegeven",
    cancelled: "Geannuleerd", settled: "Afgewikkeld", not_applicable: "Niet van toepassing",
  },
  en: {
    pending: "Pending", approved: "Approved", rejected: "Rejected",
    reversed: "Reversed", tracked: "Tracked", credited: "Posted",
    posted: "Posted", reserved: "Reserved", released: "Released",
    cancelled: "Cancelled", settled: "Settled", not_applicable: "Not applicable",
  },
  de: {
    pending: "Ausstehend", approved: "Genehmigt", rejected: "Abgelehnt",
    reversed: "Rückgängig gemacht", tracked: "Erfasst", credited: "Gebucht",
    posted: "Gebucht", reserved: "Reserviert", released: "Freigegeben",
    cancelled: "Storniert", settled: "Abgerechnet", not_applicable: "Nicht zutreffend",
  },
};

export function consumerActivityStatus(status: string, locale: Locale): string {
  return Object.hasOwn(statuses[locale], status) ? statuses[locale][status] : status;
}
