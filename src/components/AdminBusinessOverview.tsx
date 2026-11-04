import Link from "next/link";
import { Panel, PanelHeading } from "@/components/DashboardPrimitives";
import type { CockpitSummary } from "@/lib/adminCockpit";
import { formatMinor } from "@/lib/money";

export default function AdminBusinessOverview({ summary }: { summary: CockpitSummary }) {
  const kpis = summary.kpis;
  const timezone = summary.timezone ?? summary.trends.timezone;
  const date = (iso: string) => new Date(iso).toLocaleDateString("nl-NL", { timeZone: timezone });
  const unavailable = summary.warnings.some((warning) => warning.code === "kpis_degraded");
  const count = (value: number | undefined) => unavailable || value === undefined ? "Niet beschikbaar" : value.toLocaleString("nl-NL");
  const sections = [
    { title: "Orders", href: null, description: "Geselecteerde periode · betaald op basis van geregistreerde betaaldatum.", rows: [
      ["Ontvangen orders", count(kpis.orders?.received_in_period)],
      ["Bevestigd betaalde orders", count(kpis.orders?.confirmed_paid_in_period)],
    ] },
    { title: "Answer24", href: "/admin/answer24", description: "Aanvragen in de periode, gegroepeerd naar huidige geregistreerde status.", rows: [
      ["Aanvragen", count(kpis.answer24?.requests_in_period)],
      ...Object.entries(kpis.answer24?.by_status ?? {}).map(([status, value]) => [status, count(value)]),
    ] },
    { title: "Vouchervoorraad", href: null, description: "Uitgifte en verzilvering in de periode; voorraad en bruikbare vouchers zijn actuele totalen.", rows: [
      ["Uitgegeven in periode", count(kpis.vouchers?.issued_in_period)],
      ["Verzilverd in periode", count(kpis.vouchers?.redeemed_in_period)],
      ["Beschikbare codes nu", count(kpis.vouchers?.available_codes)],
      ["Bruikbare vouchers nu", count(kpis.vouchers?.outstanding)],
    ] },
    ...(["points", "eur_credit"] as const).map((unit) => {
      const wallet = kpis.wallets?.[unit];
      const value = (key: keyof NonNullable<typeof wallet>) => unavailable ? "Niet beschikbaar" : unit === "eur_credit" ? formatMinor(wallet?.[key] ?? 0) : count(wallet?.[key] ?? 0);
      return { title: unit === "points" ? "Punten" : "EUR-tegoed", href: "/admin/wallets", description: "Ledgerbewegingen in de periode; saldi zijn actueel. Openstaand = beschikbaar + gereserveerd; pending staat apart.", rows: [
        ["Uitgegeven in periode", value("issued_in_period")],
        ["Besteed in periode", value("spent_in_period")],
        ["Verlopen in periode", value("expired_in_period")],
        ["Openstaand nu", value("outstanding")],
        ["Beschikbaar nu", value("available")],
        ["Gereserveerd nu", value("reserved")],
        ["Pending nu", value("pending")],
      ] };
    }),
    { title: "Geschillen", href: "/admin/disputes", description: "Actuele open zaken, inclusief under_review en waiting_for_merchant.", rows: [["Open geschillen nu", count(kpis.disputes?.open)]] },
  ];
  return (
    <Panel className="mt-5">
      <PanelHeading title="Bedrijfsoverzicht" description={"Periode " + date(summary.period.from) + " t/m " + date(summary.period.to) + " · " + timezone} />
      {unavailable && <p role="status" className="mb-4 text-sm text-amber-800">Bedrijfsgegevens zijn tijdelijk niet beschikbaar.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => (
          <section key={section.title} aria-label={section.title} className="rounded-xl border border-blue-100 p-4">
            <h3 className="font-extrabold text-navy">{section.href ? <Link className="text-brand hover:underline" href={section.href}>{section.title}</Link> : section.title}</h3>
            <p className="my-2 text-xs text-muted">{section.description}</p>
            <dl className="space-y-2 text-sm">
              {section.rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="font-bold text-navy">{value}</dd></div>)}
            </dl>
          </section>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted">Bron: orders, Answer24-aanvragen, voucher- en walletledgers en geschillen. Bijgewerkt {summary.generated_at} · cache {summary.cache_seconds}s. Een ontbrekende walleteenheid betekent geen geregistreerde saldi of bewegingen.</p>
    </Panel>
  );
}
