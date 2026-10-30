"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon, { type DashboardIconName } from "@/components/DashboardIcon";
import {
  DashboardHeading,
  DashboardLineChart,
  DashboardStatCard,
  Panel,
  PanelHeading,
} from "@/components/DashboardPrimitives";
import { ApiError } from "@/lib/api";
import {
  type ActivityItem,
  type CockpitPeriod,
  type CockpitSummary,
  type SearchGroup,
  PERIOD_OPTIONS,
  fetchCockpit,
  fetchCockpitActivity,
  formatActivityTime,
  formatChange,
  formatChartDayLabel,
  activityRowKey,
  searchCockpit,
} from "@/lib/adminCockpit";

function typeIcon(type: string): DashboardIconName {
  if (type === "Webshop") return "store";
  if (type === "Voucher") return "ticket";
  if (type === "Affiliate") return "coins";
  if (type === "Wallet") return "wallet";
  if (type === "Sync") return "sync";
  return "chat";
}

function AdminDashboardPage() {
  const router = useRouter();
  const params = useSearchParams();
  const initialQ = params.get("q") || "";

  const [period, setPeriod] = useState<CockpitPeriod>("30d");
  const [summary, setSummary] = useState<CockpitSummary | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState(initialQ);
  const [searchGroups, setSearchGroups] = useState<SearchGroup[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadSummary = useCallback(
    async (signal?: AbortSignal) => {
      setChartLoading(true);
      setError(null);
      try {
        const data = await fetchCockpit(period, { signal });
        if (!signal?.aborted) setSummary(data);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Cockpitgegevens konden niet worden geladen.");
        setSummary(null);
      } finally {
        if (!signal?.aborted) {
          setChartLoading(false);
          setLoading(false);
        }
      }
    },
    [period]
  );

  const loadActivity = useCallback(async (signal?: AbortSignal) => {
    setActivityError(null);
    try {
      const res = await fetchCockpitActivity({ perPage: 20, signal });
      if (!signal?.aborted) setActivity(res.data);
    } catch (err) {
      if (signal?.aborted) return;
      setActivityError(err instanceof ApiError ? err.message : "Activiteit kon niet worden geladen.");
      setActivity([]);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void loadSummary(ac.signal);
    return () => ac.abort();
  }, [loadSummary]);

  useEffect(() => {
    const ac = new AbortController();
    void loadActivity(ac.signal);
    return () => ac.abort();
  }, [loadActivity]);

  useEffect(() => {
    const q = searchQ.trim();
    if (q.length < 2) {
      setSearchGroups([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchLoading(true);
      setSearchError(null);
      void searchCockpit(q, ac.signal)
        .then((res) => {
          if (!ac.signal.aborted) setSearchGroups(res.groups);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          setSearchError(err instanceof ApiError ? err.message : "Zoeken mislukt.");
          setSearchGroups([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) setSearchLoading(false);
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [searchQ]);

  const cards = summary?.cards ?? [];
  const days = summary?.trends.days ?? [];
  const chartValues = days.map((d) => d.vouchers_issued);
  const chartLabels = days.map((d) => formatChartDayLabel(d.date));
  const chartDates = days.map((d) => d.date);
  const channels = summary?.affiliate_channels.channels ?? [];
  const channelTotal = summary?.affiliate_channels.total ?? 0;
  const openActions = summary?.attention.open_actions;
  const warnings = summary?.warnings ?? [];

  const donutGradient = useMemo(() => {
    if (channels.length === 0) return "conic-gradient(#e8eff9 0% 100%)";
    const colors = ["#0b74ff", "#8cc4ff", "#c5daf8", "#94a3b8"];
    let cursor = 0;
    const parts = channels.map((ch, i) => {
      const start = cursor;
      cursor += ch.percent;
      return `${colors[i % colors.length]} ${start}% ${cursor}%`;
    });
    return `conic-gradient(${parts.join(", ")})`;
  }, [channels]);

  const actionItems = openActions
    ? [
        { ...openActions.pending_approvals, icon: "store" as const, tone: "red" as const },
        { ...openActions.failed_syncs, icon: "sync" as const, tone: "amber" as const },
        { ...openActions.open_support, icon: "chat" as const, tone: "red" as const },
      ]
    : [];

  return (
    <DashboardShell admin>
      <DashboardHeading
        title="Super Admin"
        accent="Cockpit"
        subtitle="Live overzicht van ShopBonus. Beheer platformprestaties en acties."
      />

      {(error || warnings.length > 0) && (
        <div className="mb-5 space-y-2">
          {error && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">{error}</p>
              <button
                type="button"
                onClick={() => void loadSummary()}
                className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-red-700 shadow-sm"
              >
                Opnieuw proberen
              </button>
            </div>
          )}
          {warnings.map((w) => (
            <div
              key={`${w.code}-${w.request_id ?? ""}`}
              className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            >
              <strong className="font-extrabold">Gedegradeerde data:</strong> {w.message}
              {w.request_id ? <span className="ml-2 text-xs text-amber-700/80">#{w.request_id}</span> : null}
            </div>
          ))}
        </div>
      )}

      {(initialQ || searchQ) && (
        <Panel className="mb-5">
          <PanelHeading title="Zoekresultaten" description={`Zoeken naar “${searchQ || initialQ}”`} />
          <input
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Zoek webshop, e-mail, order, voucher…"
            className="mb-4 w-full rounded-xl border border-blue-100 px-3 py-2.5 text-sm text-navy outline-none focus:border-brand"
          />
          {searchLoading && <p className="text-sm text-muted">Zoeken…</p>}
          {searchError && <p className="text-sm text-red-600">{searchError}</p>}
          {!searchLoading && !searchError && searchQ.trim().length >= 2 && searchGroups.length === 0 && (
            <p className="text-sm text-muted">Geen resultaten.</p>
          )}
          <div className="space-y-4">
            {searchGroups.map((group) => (
              <div key={group.type}>
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">{group.label}</p>
                <ul className="space-y-1">
                  {group.results.map((item) => (
                    <li key={`${item.type}-${item.id}`}>
                      <Link
                        href={item.href}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 hover:bg-blue-50"
                      >
                        <span>
                          <span className="block text-sm font-extrabold text-navy">{item.title}</span>
                          {item.subtitle && <span className="text-xs text-muted">{item.subtitle}</span>}
                        </span>
                        <DashboardIcon name="chevron" size={16} className="text-brand" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {loading && cards.length === 0
          ? Array.from({ length: 6 }, (_, i) => (
              <DashboardStatCard key={`skeleton-${i}`} label="…" value="…" icon="grid" loading />
            ))
          : cards.map((card) => (
              <DashboardStatCard
                key={card.key}
                label={card.label}
                value={card.display}
                change={formatChange(card.change_percent)}
                helper={card.helper}
                icon={(card.icon as DashboardIconName) || "grid"}
                tone={card.tone === "amber" ? "amber" : "blue"}
                href={card.href}
                loading={loading}
              />
            ))}
      </div>

      <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeading
            title="Uitgegeven vouchers"
            description="Dagelijks overzicht van issuance-events over het geselecteerde tijdvak."
            action={
              <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy">
                <DashboardIcon name="calendar" size={16} className="text-brand" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as CockpitPeriod)}
                  className="bg-transparent outline-none"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
            <span className="h-2.5 w-2.5 rounded-full bg-brand" />
            Totaal in periode:{" "}
            <strong className="text-navy">
              {chartValues.reduce((a, b) => a + b, 0).toLocaleString("nl-NL")}
            </strong>
          </div>
          {chartLoading ? (
            <div className="grid h-[300px] place-items-center text-sm text-muted">Grafiek laden…</div>
          ) : (
            <DashboardLineChart
              values={chartValues}
              id="admin-vouchers-issued"
              labels={chartLabels}
              dates={chartDates}
              height={300}
              emptyLabel="Nog geen uitgegeven vouchers in deze periode."
              onPointClick={(_i, date) => {
                if (date) router.push(`/admin/vouchers?issued_on=${date}`);
              }}
            />
          )}
          <p className="mt-2 border-t border-blue-50 pt-3 text-xs text-muted">
            Bron: voucherledger · tijdzone {summary?.trends.timezone ?? "Europe/Amsterdam"}
            {summary?.generated_at
              ? ` · bijgewerkt ${formatActivityTime(summary.generated_at)}`
              : null}
          </p>
        </Panel>

        <Panel id="affiliate" className="xl:col-span-5">
          <PanelHeading
            title="Verdeling affiliatekanalen"
            description={
              summary?.affiliate_channels.metric_label ??
              "Affiliateconversies per netwerk (geen commissiebedragen)."
            }
            action={
              <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy">
                <DashboardIcon name="calendar" size={16} className="text-brand" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as CockpitPeriod)}
                  className="bg-transparent outline-none"
                >
                  {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            }
          />
          <div className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-center sm:gap-8">
            <div
              className="relative grid h-48 w-48 shrink-0 place-items-center rounded-full"
              style={{ background: donutGradient }}
            >
              <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-white text-center shadow-inner">
                <div>
                  <p className="text-2xl font-black text-navy">{channelTotal.toLocaleString("nl-NL")}</p>
                  <p className="text-xs font-semibold text-muted">conversies</p>
                </div>
              </div>
            </div>
            <div className="w-full max-w-xs space-y-4">
              {channels.length === 0 && (
                <p className="text-sm text-muted">Geen affiliateconversies in deze periode.</p>
              )}
              {channels.map((ch, i) => (
                <Link
                  key={ch.network}
                  href={ch.href}
                  className="flex items-center gap-3 border-b border-blue-50 pb-3 last:border-0 hover:opacity-80"
                >
                  <span
                    className="h-3.5 w-3.5 shrink-0 rounded-full"
                    style={{ background: i === 0 ? "#0b74ff" : i === 1 ? "#8cc4ff" : "#94a3b8" }}
                  />
                  <span className="flex-1 font-semibold text-navy">{ch.label}</span>
                  <strong className="text-navy">{ch.count.toLocaleString("nl-NL")}</strong>
                  <span className="w-10 text-right text-sm text-muted">{ch.percent}%</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-blue-50/70 px-4 py-3 text-xs text-muted">
            Metric: <strong className="text-navy">{summary?.affiliate_channels.metric ?? "conversions"}</strong>
            {" · "}
            Gescheiden van commissiebedragen. Klik een kanaal voor gefilterde records.
          </div>
        </Panel>
      </div>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-12">
        <Panel id="webshops" className="p-0 xl:col-span-7">
          <div className="flex flex-col gap-3 border-b border-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h2 className="text-lg font-black text-navy sm:text-xl">Recente activiteit</h2>
              <p className="text-sm text-muted">De laatste belangrijke gebeurtenissen in ShopBonus.</p>
            </div>
            <Link
              href="/admin/activity"
              className="inline-flex items-center gap-1.5 self-start rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-blue-100 sm:self-auto"
            >
              Alles bekijken <DashboardIcon name="arrow" size={14} />
            </Link>
          </div>

          {activityError && <p className="px-5 py-4 text-sm text-red-600">{activityError}</p>}

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="bg-blue-50/70 text-xs font-extrabold text-muted">
                  <th className="px-5 py-3">Tijd</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Omschrijving</th>
                  <th className="px-3 py-3">Details</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {activity.map((item, index) => (
                  <tr
                    key={activityRowKey(item, index)}
                    className="cursor-pointer border-b border-blue-50 last:border-0 hover:bg-blue-50/40"
                    onClick={() => item.href && router.push(item.href)}
                  >
                    <td className="whitespace-nowrap px-5 py-3 text-xs text-muted">
                      {formatActivityTime(item.occurred_at)}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand">
                        <DashboardIcon name={typeIcon(item.type)} size={15} />
                        {item.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-navy">{item.description}</td>
                    <td className="px-3 py-3 text-muted">{item.detail}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="rounded-lg px-2 text-lg font-black text-muted">···</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activity.length === 0 && !activityError && (
              <p className="px-5 py-8 text-center text-sm text-muted">Nog geen activiteit.</p>
            )}
          </div>

          <div className="space-y-2 p-3 md:hidden">
            {activity.map((item, index) => (
              <button
                key={activityRowKey(item, index)}
                type="button"
                onClick={() => item.href && router.push(item.href)}
                className="flex w-full items-start gap-3 rounded-xl bg-slate-50/70 p-3 text-left"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand">
                  <DashboardIcon name={typeIcon(item.type)} size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-brand">{item.type}</span>
                    <span className="text-[11px] text-muted">{formatActivityTime(item.occurred_at)}</span>
                  </span>
                  <span className="block text-sm font-extrabold text-navy">{item.description}</span>
                  <span className="block text-xs text-muted">{item.detail}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>

        <div id="support" className="space-y-5 xl:col-span-5">
          <Panel id="actions">
            <PanelHeading
              title="Actie vereist"
              description="Items die om aandacht vragen. Alleen openen — geen goedkeuring of retry."
              action={
                <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600">
                  {openActions?.total ?? 0} open
                </span>
              }
            />
            <div className="space-y-2.5">
              {actionItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 text-left transition hover:border-brand/40 hover:bg-blue-50/30"
                >
                  <span
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                      item.tone === "red" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"
                    }`}
                  >
                    <DashboardIcon name={item.icon} size={21} />
                  </span>
                  <span
                    className={`text-2xl font-black ${item.tone === "red" ? "text-red-500" : "text-amber-600"}`}
                  >
                    {item.count}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-extrabold text-navy">{item.title}</span>
                    <span className="block text-xs leading-snug text-muted">{item.detail}</span>
                  </span>
                  <DashboardIcon name="chevron" size={17} className="shrink-0 text-brand" />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel id="settings" className="bg-gradient-to-br from-blue-50 to-white">
            <div className="flex gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm">
                <DashboardIcon name="settings" size={21} />
              </span>
              <div>
                <h3 className="font-black text-navy">Platformstatus</h3>
                <p className="mt-1 text-sm text-muted">
                  {warnings.length === 0
                    ? "Alle systemen werken normaal."
                    : "Sommige bronnen zijn tijdelijk gedegradeerd."}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
              <div className="rounded-xl bg-white p-3 text-muted">
                API status{" "}
                <span className={`float-right ${error ? "text-amber-600" : "text-green-600"}`}>
                  ● {error ? "Degraded" : "Online"}
                </span>
              </div>
              <div className="rounded-xl bg-white p-3 text-muted">
                Affiliate{" "}
                <span
                  className={`float-right ${
                    summary?.sources.affiliate === "degraded" ? "text-amber-600" : "text-green-600"
                  }`}
                >
                  ● {summary?.sources.affiliate === "degraded" ? "Degraded" : "Online"}
                </span>
              </div>
            </div>
            <Link href="/admin/settings" className="mt-4 inline-block text-sm font-extrabold text-brand hover:underline">
              Platforminstellingen openen →
            </Link>
          </Panel>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>ShopBonus admin cockpit · Live data uit bestaande ledgers</span>
        <span>
          Laatste update:{" "}
          {summary?.generated_at ? formatActivityTime(summary.generated_at) : "—"}
          {summary?.cache_seconds ? ` · cache ${summary.cache_seconds}s` : ""}
        </span>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="p-8">Cockpit laden…</p>}>
      <AdminDashboardPage />
    </Suspense>
  );
}
