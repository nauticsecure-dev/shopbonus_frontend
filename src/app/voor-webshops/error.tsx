"use client";
import { useLocale } from "@/i18n/LocaleContext";

export default function MerchantLandingError({ reset }: { reset: () => void }) {
  const { locale } = useLocale();
  const nl = locale === "nl";
  return (
    <section className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="text-3xl font-bold text-navy">{nl ? "Pagina tijdelijk niet beschikbaar" : "Page temporarily unavailable"}</h1>
      <p className="mt-4 text-muted">{nl ? "De goedgekeurde publicatie kon niet worden geladen. Probeer het opnieuw." : "The approved publication could not be loaded. Please try again."}</p>
      <button type="button" onClick={reset} className="mt-6 rounded-xl bg-brand px-5 py-3 text-white">{nl ? "Opnieuw proberen" : "Try again"}</button>
    </section>
  );
}
