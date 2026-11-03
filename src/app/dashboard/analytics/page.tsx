"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import { DashboardHeading, DashboardLineChart, DashboardStatCard, Panel, PanelHeading } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { fetchMerchantAnalytics, fetchAttributionOrders, type AttributionOrders, type MerchantAnalytics } from "@/lib/merchantAnalytics";
import { useLocale } from "@/i18n/LocaleContext";
import { formatMinor } from "@/lib/money";

export default function MerchantAnalyticsPage() {
  const { dictionary: t, intlLocale } = useLocale();
  const money = (minor: number, code: string) => formatMinor(minor, code, intlLocale);
  const { workspaceId, revision } = useWorkspace();
  const [days, setDays] = useState(30);
  const [metric, setMetric] = useState("revenue");
  const [currency, setCurrency] = useState("EUR");
  const [result, setResult] = useState<{ key: string; data: MerchantAnalytics | null; error: boolean } | null>(null);
  const [retry, setRetry] = useState(0);
  const [drillType, setDrillType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [drillResult, setDrillResult] = useState<{ key: string; data: AttributionOrders | null; error: boolean } | null>(null);
  const requestKey = JSON.stringify([workspaceId, revision, days, retry]);
  const current = result?.key === requestKey ? result : null;
  const data = current?.data ?? null;
  const error = current?.error ?? false;
  const loading = Boolean(workspaceId) && current === null;
  const drillKey = JSON.stringify([requestKey, drillType, page]);
  const drill = drillResult?.key === drillKey ? drillResult.data : null;
  const drillError = drillResult?.key === drillKey && drillResult.error;

  useEffect(() => {
    const controller = new AbortController();
    if (!workspaceId) return () => controller.abort();
    fetchMerchantAnalytics(workspaceId, days, controller.signal).then((report) => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data: report, error: false });
    }).catch(() => {
      if (!controller.signal.aborted) setResult({ key: requestKey, data: null, error: true });
    });
    return () => controller.abort();
  }, [workspaceId, days, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    if (workspaceId && data && drillType && !loading && !error) fetchAttributionOrders(workspaceId, data, drillType, page, controller.signal)
      .then((rows) => { if (!controller.signal.aborted) setDrillResult({ key: drillKey, data: rows, error: false }); })
      .catch(() => { if (!controller.signal.aborted) setDrillResult({ key: drillKey, data: null, error: true }); });
    return () => controller.abort();
  }, [workspaceId, data, drillType, page, loading, error, drillKey]);

  const currencies = Object.keys(data?.orders ?? {});
  const selectedCurrency = currencies.includes(currency) ? currency : currencies[0] ?? "EUR";
  const orders = Object.values(data?.orders ?? {}).reduce((total, row) => total + row.paid_orders, 0);
  const values = data?.sales_series.map((day) => metric === "revenue" ? (day.orders[selectedCurrency]?.net_minor ?? 0) / 100 : day.paid_orders) ?? [];

  return <DashboardShell>
    <DashboardHeading title={t.analyticsTitle} accent={t.analyticsAccent} subtitle={t.analyticsSubtitle}
      action={<label className="rounded-xl border border-blue-100 bg-white p-3 text-sm font-bold">{t.analyticsPeriod} <select aria-label={t.analyticsPeriod} value={days} onChange={(e) => setDays(Number(e.target.value))}>{[7, 30, 90].map((n) => <option key={n} value={n}>{t.analyticsDays.replace("{count}", n.toLocaleString(intlLocale))}</option>)}</select></label>} />
    {loading ? <Panel><p role="status">{t.analyticsLoading}</p></Panel> : error ? <Panel><p role="alert">{t.analyticsError}</p><button onClick={() => setRetry((n) => n + 1)}>{t.analyticsRetry}</button></Panel> : !data ? <Panel>{t.analyticsSelectShop}</Panel> : <>
      <p className="mb-4 text-xs text-muted">{data.sales_series[0]?.date} – {data.sales_series.at(-1)?.date} · {data.timezone} · {t.analyticsUpdated}: {new Date(data.generated_at).toLocaleString(intlLocale)}</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label={t.analyticsImpressions} value={(data.banner_metrics.viewable_impressions ?? 0).toLocaleString(intlLocale)} icon="eye" />
        <DashboardStatCard label={t.analyticsClicks} value={(data.banner_metrics.cta_clicks ?? 0).toLocaleString(intlLocale)} icon="cursor" />
        <DashboardStatCard label={t.analyticsPaidOrders} value={orders.toLocaleString(intlLocale)} icon="cart" />
        <DashboardStatCard label={`${t.analyticsNetRevenue} (${selectedCurrency})`} value={money(data.orders[selectedCurrency]?.net_minor ?? 0, selectedCurrency)} icon="coins" />
      </div>
      <Panel className="mt-5">
        <PanelHeading title={t.analyticsSalesTitle} description={t.analyticsSalesDescription} action={<div className="flex gap-3">
          <select aria-label={t.analyticsMetric} value={metric} onChange={(e) => setMetric(e.target.value)}><option value="revenue">{t.analyticsRevenue}</option><option value="orders">{t.analyticsOrders}</option></select>
          {currencies.length > 1 && <select aria-label={t.analyticsCurrency} value={selectedCurrency} onChange={(e) => setCurrency(e.target.value)}>{currencies.map((c) => <option key={c}>{c}</option>)}</select>}
        </div>} />
        {orders === 0 ? <p>{t.analyticsNoPaidOrders}</p> : <DashboardLineChart values={values} labels={data.sales_series.map((day) => day.date)} id="merchant-analytics" height={310} locale={intlLocale} ariaLabel={t.analyticsChart} emptyLabel={t.analyticsNoPaidOrders} />}
        <p className="mt-3 text-xs text-muted">{t.analyticsCtr.replace("{value}", data.banner_metrics.ctr == null ? t.analyticsUnavailable : data.banner_metrics.ctr.toLocaleString(intlLocale, { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }))}</p>
      </Panel>
      <Panel className="mt-5"><PanelHeading title={t.analyticsVouchersTitle} description={t.analyticsVouchersDescription}
        action={<Link href="/dashboard/vouchers" className="font-bold text-brand">{t.analyticsViewDetails}</Link>} />
        <div className="grid gap-4 sm:grid-cols-3">{([[t.analyticsIssued, data.vouchers.issued], [t.analyticsClaimed, data.answer24.claims], [t.analyticsRedeemed, data.vouchers.redeemed]] as const).map(([label, count]) => <div key={label} className="rounded-xl bg-slate-50 p-4"><strong className="text-2xl">{count.toLocaleString(intlLocale)}</strong><p>{label}</p></div>)}</div>
      </Panel>
      <Panel className="mt-5"><PanelHeading title={t.analyticsAttribution} description={t.analyticsAttributionDescription} />
        <div className="grid gap-4 sm:grid-cols-4">{[["click", t.analyticsClick], ["voucher", t.analyticsVoucher], ["view", t.analyticsView], ["unattributed", t.analyticsUnknown]].map(([key, label]) => {
          const bucket = data.attribution[key];
          return <div key={key}><button className="font-bold text-brand underline" onClick={() => { setDrillType(key); setPage(1); }}>{label}</button><p>{t.analyticsOrderCount.replace("{count}", (typeof bucket === "object" ? bucket.orders : 0).toLocaleString(intlLocale))}</p>{typeof bucket === "object" && Object.entries(bucket.by_currency).map(([code, amount]) => <p key={code}>{money(amount.net_revenue_minor, code)}</p>)}</div>;
        })}</div>
        {drillType && <div className="mt-5 overflow-x-auto border-t pt-4" aria-label={t.analyticsAttributionDetails}>
          <button className="mb-3 text-sm underline" onClick={() => setDrillType(null)}>{t.analyticsCloseDetails}</button>
          {drillError ? <p role="alert">{t.analyticsOrdersError}</p> : !drill ? <p role="status">{t.analyticsOrdersLoading}</p> : <>
            <table className="w-full text-left text-sm"><thead><tr><th>{t.analyticsReference}</th><th>{t.analyticsPaidAt}</th><th>{t.analyticsNetRevenue}</th></tr></thead><tbody>{drill.data.map((row) => <tr key={row.id}><td>{row.reference ?? row.id}</td><td>{new Date(row.paid_at).toLocaleDateString(intlLocale)}</td><td>{money(row.net_minor, row.currency)}</td></tr>)}</tbody></table>
            {drill.data.length === 0 && <p>{t.analyticsNoOrders}</p>}
            <div className="mt-3 flex gap-4"><button disabled={page === 1} onClick={() => setPage((n) => n - 1)}>{t.prev}</button><span>{page.toLocaleString(intlLocale)} / {drill.meta.last_page.toLocaleString(intlLocale)}</span><button disabled={page >= drill.meta.last_page} onClick={() => setPage((n) => n + 1)}>{t.next}</button></div>
          </>}
        </div>}
        <p className="mt-4 text-sm">{t.analyticsNetwork.replace("{referred}", data.network.as_referrer.journeys.toLocaleString(intlLocale)).replace("{received}", data.network.as_receiver.journeys.toLocaleString(intlLocale))}</p>
      </Panel>
      <Panel className="mt-5"><PanelHeading title={t.analyticsBannersTitle} description={t.analyticsBannersDescription} /><Link href="/dashboard/banners" className="font-bold text-brand">{t.analyticsViewBanners}</Link></Panel>
      <p className="mt-5 text-xs text-muted">{t.analyticsDisclaimer}</p>
    </>}
  </DashboardShell>;
}
