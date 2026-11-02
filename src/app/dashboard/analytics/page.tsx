"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { DashboardHeading, DashboardLineChart, DashboardStatCard, Panel, PanelHeading } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { fetchMerchantAnalytics, fetchAttributionOrders, type AttributionOrders, type MerchantAnalytics } from "@/lib/merchantAnalytics";
import { formatMinor } from "@/lib/money";

export default function MerchantAnalyticsPage() {
  const { workspaceId, revision } = useWorkspace();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("Omzet");
  const [currency, setCurrency] = useState("EUR");
  const [result, setResult] = useState<{ workspaceId: string; data: MerchantAnalytics } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [drillType, setDrillType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [drill, setDrill] = useState<AttributionOrders | null>(null);
  const [drillError, setDrillError] = useState(false);
  const data = result?.workspaceId === workspaceId ? result.data : null;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    if (!workspaceId) { setLoading(false); return () => controller.abort(); }
    fetchMerchantAnalytics(workspaceId, days, controller.signal).then((report) => {
      if (!controller.signal.aborted) setResult({ workspaceId, data: report });
    }).catch(() => {
      if (!controller.signal.aborted) setError("Rapportage kon niet worden geladen. Probeer opnieuw.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [workspaceId, revision, days, retry]);

  useEffect(() => {
    const controller = new AbortController();
    setDrill(null); setDrillError(false);
    if (workspaceId && data && drillType && !loading && !error) fetchAttributionOrders(workspaceId, data, drillType, page, controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setDrill(rows); })
      .catch(() => { if (!controller.signal.aborted) setDrillError(true); });
    return () => controller.abort();
  }, [workspaceId, data, drillType, page, loading, error]);

  const currencies = Object.keys(data?.orders ?? {});
  const selectedCurrency = currencies.includes(currency) ? currency : currencies[0] ?? "EUR";
  const orders = Object.values(data?.orders ?? {}).reduce((total, row) => total + row.paid_orders, 0);
  const values = data?.sales_series.map((day) => metric === "Omzet" ? (day.orders[selectedCurrency]?.net_minor ?? 0) / 100 : day.paid_orders) ?? [];

  return <DashboardShell>
    <DashboardHeading title="Zo presteren jouw" accent="aanbiedingen." subtitle="Geverifieerde bestellingen, vouchers en attributie binnen jouw webshop."
      action={<label className="rounded-xl border border-blue-100 bg-white p-3 text-sm font-bold">Periode <select aria-label="Periode" value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90].map((n) => <option key={n} value={n}>{n} dagen</option>)}</select></label>} />
    {loading ? <Panel><p role="status">Rapportage laden…</p></Panel> : error ? <Panel><p role="alert">{error}</p><button onClick={() => setRetry((n) => n + 1)}>Opnieuw proberen</button></Panel> : !data ? <Panel>Selecteer een webshop om de rapportage te bekijken.</Panel> : <>
      <p className="mb-4 text-xs text-muted">{data.sales_series[0]?.date} – {data.sales_series.at(-1)?.date} · {data.timezone} · Bijgewerkt: {new Date(data.generated_at).toLocaleString("nl-NL")}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Zichtbare bannervertoningen" value={(data.banner_metrics.viewable_impressions ?? 0).toLocaleString("nl-NL")} icon="eye" />
        <DashboardStatCard label="CTA-klikken" value={(data.banner_metrics.cta_clicks ?? 0).toLocaleString("nl-NL")} icon="cursor" />
        <DashboardStatCard label="Betaalde bestellingen" value={orders.toLocaleString("nl-NL")} icon="cart" />
        <DashboardStatCard label={`Netto-omzet (${selectedCurrency})`} value={formatMinor(data.orders[selectedCurrency]?.net_minor ?? 0, selectedCurrency)} icon="coins" />
      </div>
      <Panel className="mt-5">
        <PanelHeading title="Verkoopontwikkeling" description="Betaalde orders met terugbetalingen verwerkt in de netto-omzet." action={<div className="flex gap-3">
          <select aria-label="Metriek" value={metric} onChange={(e) => setMetric(e.target.value)}><option>Omzet</option><option>Bestellingen</option></select>
          {currencies.length > 1 && <select aria-label="Valuta" value={selectedCurrency} onChange={(e) => setCurrency(e.target.value)}>{currencies.map((c) => <option key={c}>{c}</option>)}</select>}
        </div>} />
        {orders === 0 ? <p>Geen betaalde bestellingen in deze periode.</p> : <DashboardLineChart values={values} labels={data.sales_series.map((day) => day.date)} id="merchant-analytics" height={310} />}
        <p className="mt-3 text-xs text-muted">CTR: {data.banner_metrics.ctr == null ? "Nog niet beschikbaar" : `${(data.banner_metrics.ctr * 100).toFixed(1)}%`}. Een klik of vertoning is geen betaalde bestelling.</p>
      </Panel>
      <Panel className="mt-5"><PanelHeading title="Voucherprestaties" description="Activiteit in de geselecteerde periode. Claims en verzilveringen kunnen oudere vouchers betreffen."
        action={<Link href="/dashboard/vouchers" className="font-bold text-brand">Bekijk details →</Link>} />
        <div className="grid gap-4 sm:grid-cols-3">{[["Uitgegeven", data.vouchers.issued], ["Geclaimd via Answer24", data.answer24.claims], ["Verzilverd", data.vouchers.redeemed]].map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><strong className="text-2xl">{count}</strong><p>{label}</p></div>)}</div>
      </Panel>
      <Panel className="mt-5"><PanelHeading title="Attributie" description="Eerste vastgelegde evidence per bestelling; associatie bewijst geen extra omzet." />
        <div className="grid gap-4 sm:grid-cols-4">{[["click", "Klik"], ["voucher", "Voucher"], ["view", "Vertoning"], ["unattributed", "Onbekend"]].map(([key, label]) => {
          const bucket = data.attribution[key];
          return <div key={key}><button className="font-bold text-brand underline" onClick={() => { setDrillType(key); setPage(1); }}>{label}</button><p>{typeof bucket === "object" ? bucket.orders : 0} bestellingen</p>{typeof bucket === "object" && Object.entries(bucket.by_currency).map(([code, amount]) => <p key={code}>{formatMinor(amount.net_revenue_minor, code)}</p>)}</div>;
        })}</div>
        {drillType && <div className="mt-5 overflow-x-auto border-t pt-4" aria-label="Attributiedetails">
          <button className="mb-3 text-sm underline" onClick={() => setDrillType(null)}>Details sluiten</button>
          {drillError ? <p role="alert">Bestellingen konden niet worden geladen.</p> : !drill ? <p role="status">Bestellingen laden…</p> : <>
            <table className="w-full text-left text-sm"><thead><tr><th>Referentie</th><th>Betaald op</th><th>Netto-omzet</th></tr></thead><tbody>{drill.data.map((row) => <tr key={row.id}><td>{row.reference ?? row.id}</td><td>{new Date(row.paid_at).toLocaleDateString("nl-NL")}</td><td>{formatMinor(row.net_minor, row.currency)}</td></tr>)}</tbody></table>
            {drill.data.length === 0 && <p>Geen bestellingen gevonden.</p>}
            <div className="mt-3 flex gap-4"><button disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Vorige</button><span>{page} / {drill.meta.last_page}</span><button disabled={page >= drill.meta.last_page} onClick={() => setPage((n) => n + 1)}>Volgende</button></div>
          </>}
        </div>}
        <p className="mt-4 text-sm">Cross-shop: {data.network.as_referrer.journeys} doorverwezen · {data.network.as_receiver.journeys} ontvangen bestellingen.</p>
      </Panel>
      <Panel className="mt-5"><PanelHeading title="Bannerinstellingen en experimenten" description="Bekijk je banners en stel een experiment met controlegroep in om effect te onderzoeken." /><Link href="/dashboard/banners" className="font-bold text-brand">Bekijk banners en experimenten →</Link></Panel>
      <p className="mt-5 text-xs text-muted">Attributie is geen causaliteit. Conversie-uplift blijft onbekend zonder volledige gerandomiseerde meting. Valuta worden afzonderlijk gerapporteerd.</p>
    </>}
  </DashboardShell>;
}
