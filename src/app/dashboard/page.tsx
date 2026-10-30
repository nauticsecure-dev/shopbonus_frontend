"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import {
  DashboardHeading,
  DashboardLineChart,
  DashboardStatCard,
  Panel,
  PanelHeading,
  StatusPill,
} from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { ApiError } from "@/lib/api";
import {
  activityLabel,
  connectionHealthLabel,
  fetchClaimsSeries,
  fetchMerchantDashboard,
  formatChartDayLabel,
  formatMinOrder,
  formatRelativeNl,
  greetingLabel,
  markNotificationRead,
  notificationHref,
  notificationTone,
  offerLifecycle,
  offerStatusLabel,
  offerTypeLabel,
  quickActionHref,
  quickActionLabel,
  webshopAccountLabel,
  type ClaimsSeries,
  type MerchantDashboard,
  type MerchantNotificationItem,
} from "@/lib/merchantDashboard";
import type { DashboardIconName } from "@/components/DashboardIcon";
import { fetchOnboarding, type OnboardingData } from "@/lib/onboarding";
import { complianceStepLabel } from "@/lib/workspaceCompliance";

const formatCount = (n: number) => n.toLocaleString("nl-NL");

function quickActionIcon(key: string): DashboardIconName {
  switch (key.trim().toLowerCase().replace(/[\s-]+/g, "_")) {
    case "create_offer":
      return "plus";
    case "import_codes":
      return "upload";
    case "connect_store":
      return "store";
    case "top_up_funding":
      return "wallet";
    case "review_vouchers":
      return "ticket";
    case "manage_offers":
      return "tag";
    case "view_orders":
      return "list";
    case "settings":
      return "settings";
    default:
      return "arrow";
  }
}

function dashboardStatusQuery(filter: string): string | undefined {
  if (filter === "all") return undefined;
  if (filter === "sold_out") return "active";
  return filter;
}

type ClaimsRange = 7 | 30 | 90;

const RANGE_OPTIONS: { days: ClaimsRange; label: string }[] = [
  { days: 7, label: "Laatste 7 dagen" },
  { days: 30, label: "Laatste 30 dagen" },
  { days: 90, label: "Laatste 90 dagen" },
];

export default function MerchantDashboardPage() {
  const router = useRouter();
  const { workspaceId, revision, current } = useWorkspace();
  const [dashboard, setDashboard] = useState<MerchantDashboard | null>(null);
  const [claims, setClaims] = useState<ClaimsSeries | null>(null);
  const [range, setRange] = useState<ClaimsRange>(30);
  const [loading, setLoading] = useState(true);
  const [claimsLoading, setClaimsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [claimsError, setClaimsError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "draft" | "expired" | "scheduled" | "archived" | "sold_out"
  >("all");
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  const loadDashboard = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMerchantDashboard(workspaceId, signal, {
        status: dashboardStatusQuery(statusFilter),
      });
      if (!signal?.aborted) setDashboard(data);
    } catch (err) {
      if (signal?.aborted) return;
      const message =
        err instanceof ApiError
          ? err.message
          : "Dashboardgegevens konden niet worden geladen.";
      setError(message);
      setDashboard(null);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [workspaceId, statusFilter]);

  const loadClaims = useCallback(async (signal?: AbortSignal) => {
    setClaimsLoading(true);
    setClaimsError(null);
    try {
      const data = await fetchClaimsSeries(workspaceId, range, signal);
      if (!signal?.aborted) setClaims(data);
    } catch (err) {
      if (signal?.aborted) return;
      setClaimsError(err instanceof ApiError ? err.message : "Claimsgrafiek kon niet worden geladen.");
      setClaims(null);
    } finally {
      if (!signal?.aborted) setClaimsLoading(false);
    }
  }, [workspaceId, range]);

  useEffect(() => {
    const ac = new AbortController();
    void loadDashboard(ac.signal);
    return () => ac.abort();
  }, [loadDashboard, revision]);

  useEffect(() => {
    const ac = new AbortController();
    void loadClaims(ac.signal);
    return () => ac.abort();
  }, [loadClaims, revision]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchOnboarding(workspaceId, ac.signal)
      .then((data) => {
        if (!ac.signal.aborted) setOnboarding(data);
      })
      .catch(() => {
        if (!ac.signal.aborted) setOnboarding(null);
      });
    return () => ac.abort();
  }, [workspaceId, revision]);

  const offers = useMemo(() => {
    const rows = dashboard?.offers ?? [];
    if (statusFilter === "all") return rows;
    return rows.filter((offer) => {
      const life = offerLifecycle(offer);
      if (statusFilter === "expired") return life === "expired" || life === "ended" || offer.status === "expired" || offer.status === "ended";
      return life === statusFilter;
    });
  }, [dashboard?.offers, statusFilter]);

  const chartValues = claims?.days.map((d) => d.claims) ?? [];
  const chartLabels = claims?.days.map((d) => formatChartDayLabel(d.date)) ?? [];
  const chartDates = claims?.days.map((d) => d.date) ?? [];
  const maxClaims = chartValues.length ? Math.max(...chartValues) : 0;

  const shopName = dashboard?.webshop.name ?? current?.name ?? "…";
  const greeting = greetingLabel(dashboard?.greeting ?? "good_morning");
  const availableActions = (dashboard?.quick_actions ?? []).filter((action) => action.available);

  const openNotification = async (notice: MerchantNotificationItem) => {
    try {
      if (!notice.read) {
        await markNotificationRead(workspaceId, notice.id);
        setDashboard((prev) =>
          prev
            ? {
                ...prev,
                notifications: {
                  unread: Math.max(0, prev.notifications.unread - 1),
                  latest: prev.notifications.latest.map((n) =>
                    n.id === notice.id ? { ...n, read: true } : n
                  ),
                },
              }
            : prev
        );
      }
    } catch {
      /* navigation still proceeds */
    }
    router.push(notificationHref(notice));
  };

  return (
    <DashboardShell>
      <DashboardHeading
        title={`${greeting},`}
        accent={shopName}
        subtitle="Je kortingsacties in één overzicht."
        action={
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {dashboard?.webshop.status && <StatusPill status={webshopAccountLabel(dashboard.webshop.status)} />}
            <Link
              href="/dashboard/offers?new=1"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark sm:px-7"
            >
              <DashboardIcon name="plus" size={20} />
              Nieuwe aanbieding
            </Link>
          </div>
        }
      />

      {error && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
            className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-red-700 shadow-sm"
          >
            Opnieuw proberen
          </button>
        </div>
      )}

      {onboarding && onboarding.next_step && onboarding.webshop_status !== "approved" && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">
            Vereiste actie: {complianceStepLabel(onboarding.next_step)} · status {onboarding.webshop_status}
          </p>
          <Link
            href={`/onboarding?step=${onboarding.next_step}`}
            className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold text-amber-800 shadow-sm"
          >
            Doorgaan
          </Link>
        </div>
      )}

      {!loading && dashboard?.empty && (
        <div className="mb-5 rounded-2xl border border-blue-100 bg-white px-4 py-5 text-sm text-muted">
          <p className="font-extrabold text-navy">Nog geen aanbiedingen of vouchers</p>
          <p className="mt-1">
            Start met een van deze stappen. De cijfers hieronder komen uit je account en worden niet ingevuld.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {availableActions.map((action) => (
              <Link
                key={action.key}
                href={quickActionHref(action.key)}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark"
              >
                <DashboardIcon name={quickActionIcon(action.key)} size={16} />
                {quickActionLabel(action.key)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {!loading && dashboard && !dashboard.empty && availableActions.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {availableActions.map((action) => (
            <Link
              key={action.key}
              href={quickActionHref(action.key)}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-extrabold text-brand shadow-sm hover:border-brand/40 hover:bg-blue-50"
            >
              <DashboardIcon name={quickActionIcon(action.key)} size={16} />
              {quickActionLabel(action.key)}
            </Link>
          ))}
        </div>
      )}

      {!loading && dashboard?.connection_health && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={connectionHealthLabel(dashboard.connection_health.status)} />
            {dashboard.connection_health.total > 0 && (
              <p className="text-sm font-semibold text-muted">
                {dashboard.connection_health.connected} van {dashboard.connection_health.total} gekoppeld
                {dashboard.connection_health.attention > 0
                  ? ` · ${dashboard.connection_health.attention} met aandacht`
                  : ""}
              </p>
            )}
            {dashboard.connection_health.last_error_at && (
              <p className="text-xs font-semibold text-muted">
                Laatste fout {formatRelativeNl(dashboard.connection_health.last_error_at)}
              </p>
            )}
          </div>
          <Link href="/dashboard/webshops" className="text-sm font-extrabold text-brand hover:underline">
            Webshops
          </Link>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Actieve aanbiedingen"
          value={formatCount(dashboard?.kpis.active_offers ?? 0)}
          helper="Momenteel actief"
          icon="tag"
          loading={loading}
          href="/dashboard/offers?status=active"
        />
        <DashboardStatCard
          label="Beschikbare codes"
          value={formatCount(dashboard?.kpis.available_codes ?? 0)}
          helper="Nog uit te geven"
          icon="ticket"
          loading={loading}
          href="/dashboard/offers?inventory=available"
        />
        <DashboardStatCard
          label="Uitgegeven vouchers"
          value={formatCount(dashboard?.kpis.issued_vouchers ?? 0)}
          helper="Totaal uitgegeven"
          icon="users"
          loading={loading}
          href="/dashboard/vouchers"
        />
        <DashboardStatCard
          label="Geclaimde vouchers"
          value={formatCount(dashboard?.kpis.claimed_vouchers ?? 0)}
          helper="Door klanten geclaimd"
          icon="check"
          tone="green"
          loading={loading}
          href="/dashboard/offers?focus=claims"
        />
        <DashboardStatCard
          label="Ingewisselde vouchers"
          value={formatCount(dashboard?.kpis.redeemed_vouchers ?? 0)}
          helper="Geverifieerd ingewisseld"
          icon="check"
          tone="green"
          loading={loading}
          href="/dashboard/vouchers?status=redeemed"
        />
        <DashboardStatCard
          label="Geplande aanbiedingen"
          value={formatCount(dashboard?.kpis.scheduled_offers ?? 0)}
          helper="Nog niet geopend"
          icon="clock"
          loading={loading}
          href="/dashboard/offers?status=scheduled"
        />
        <DashboardStatCard
          label="Gepauzeerde aanbiedingen"
          value={formatCount(dashboard?.kpis.paused_offers ?? 0)}
          helper="Tijdelijk stopgezet"
          icon="pause"
          tone="amber"
          loading={loading}
          href="/dashboard/offers?status=paused"
        />
        <DashboardStatCard
          label="Openstaande geschillen"
          value={formatCount(dashboard?.kpis.open_disputes ?? 0)}
          helper="Nog niet afgehandeld"
          icon="alert"
          tone="amber"
          loading={loading}
          href="/dashboard/vouchers?tab=disputes"
        />
      </section>

      <div className="mt-5 grid items-start gap-5 2xl:grid-cols-12">
        <Panel className="2xl:col-span-7">
          <PanelHeading
            title="Jouw aanbiedingen"
            description="Overzicht van al je kortingsacties via ShopBonus."
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                  className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy outline-none focus:border-brand"
                  aria-label="Filter aanbiedingen"
                >
                  <option value="all">Alle statussen</option>
                  <option value="active">Actief</option>
                  <option value="paused">Gepauzeerd</option>
                  <option value="draft">Concept</option>
                  <option value="scheduled">Gepland</option>
                  <option value="sold_out">Uitverkocht</option>
                  <option value="expired">Verlopen</option>
                  <option value="archived">Gearchiveerd</option>
                </select>
                <Link href="/dashboard/offers" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand hover:underline">
                  Alles beheren <DashboardIcon name="arrow" size={16} />
                </Link>
              </div>
            }
          />

          {loading && (
            <p className="py-10 text-center text-sm font-semibold text-muted" role="status">
              Aanbiedingen laden…
            </p>
          )}

          {!loading && !error && offers.length === 0 && (
            <div className="py-10 text-center">
              <p className="font-extrabold text-navy">Nog geen aanbiedingen</p>
              <p className="mt-1 text-sm text-muted">Maak je eerste kortingsactie aan om te starten.</p>
              <Link href="/dashboard/offers?new=1" className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white">
                Nieuwe aanbieding
              </Link>
            </div>
          )}

          {!loading && offers.length > 0 && (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[700px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-blue-50/70 text-xs font-extrabold text-muted">
                      <th className="rounded-l-xl px-3 py-3">Aanbieding</th>
                      <th className="px-3 py-3">Type</th>
                      <th className="px-3 py-3">Voorwaarde</th>
                      <th className="px-3 py-3 text-center">Voorraad</th>
                      <th className="px-3 py-3 text-center">Uitgegeven</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="rounded-r-xl px-3 py-3 text-right">Beheren</th>
                    </tr>
                  </thead>
                  <tbody>
                    {offers.map((offer) => (
                      <tr key={offer.id} className="border-b border-blue-50 last:border-0">
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                              <DashboardIcon name="ticket" size={20} />
                            </span>
                            <div>
                              <p className="font-extrabold text-navy">{offer.name ?? offer.summary ?? "Aanbieding"}</p>
                              <p className="text-xs text-muted">
                                {offer.summary ?? `Vanaf ${formatMinOrder(offer.min_order_minor)}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand">
                            {offerTypeLabel(offer.type)}
                          </span>
                        </td>
                        <td className="px-3 py-4 font-semibold text-navy">{formatMinOrder(offer.min_order_minor)}</td>
                        <td className="px-3 py-4 text-center font-bold text-navy">{formatCount(offer.available_codes)}</td>
                        <td className="px-3 py-4 text-center font-bold text-navy">{formatCount(offer.issued)}</td>
                        <td className="px-3 py-4">
                          <StatusPill status={offerStatusLabel(offerLifecycle(offer))} />
                        </td>
                        <td className="px-3 py-4 text-right">
                          <Link
                            href={`/dashboard/offers?offer=${encodeURIComponent(offer.id)}`}
                            className="text-sm font-extrabold text-brand hover:underline"
                          >
                            Beheren
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {offers.map((offer) => (
                  <article key={offer.id} className="rounded-2xl border border-blue-50 bg-slate-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white">
                          <DashboardIcon name="ticket" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-navy">{offer.name ?? "Aanbieding"}</p>
                          <p className="text-xs text-muted">
                            {offerTypeLabel(offer.type)} · vanaf {formatMinOrder(offer.min_order_minor)}
                          </p>
                        </div>
                      </div>
                      <StatusPill status={offerStatusLabel(offerLifecycle(offer))} />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-muted">Voorraad</p>
                        <p className="font-extrabold text-navy">{formatCount(offer.available_codes)}</p>
                      </div>
                      <div className="rounded-xl bg-white p-3">
                        <p className="text-xs text-muted">Uitgegeven</p>
                        <p className="font-extrabold text-navy">{formatCount(offer.issued)}</p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/offers?offer=${encodeURIComponent(offer.id)}`}
                      className="mt-3 block rounded-xl bg-blue-50 py-2.5 text-center text-sm font-extrabold text-brand"
                    >
                      Beheren
                    </Link>
                  </article>
                ))}
              </div>
            </>
          )}
        </Panel>

        <div className="space-y-5 2xl:col-span-5">
          <Panel>
            <PanelHeading
              title="Meldingen"
              action={
                <Link href="/dashboard/notifications" className="inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:underline">
                  Alles bekijken <DashboardIcon name="arrow" size={15} />
                </Link>
              }
            />
            {loading && <p className="py-6 text-center text-sm text-muted">Meldingen laden…</p>}
            {!loading && (dashboard?.notifications.latest.length ?? 0) === 0 && (
              <p className="py-6 text-center text-sm font-semibold text-muted">Geen open meldingen.</p>
            )}
            <div className="space-y-2.5">
              {(dashboard?.notifications.latest ?? []).slice(0, 4).map((notice) => {
                const tone = notificationTone(notice);
                return (
                  <button
                    key={notice.id}
                    type="button"
                    onClick={() => void openNotification(notice)}
                    className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 text-left transition hover:border-brand/40 hover:bg-blue-50/30"
                  >
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        tone === "warning"
                          ? "bg-amber-50 text-amber-500"
                          : tone === "success"
                            ? "bg-green-50 text-green-600"
                            : "bg-blue-50 text-brand"
                      }`}
                    >
                      <DashboardIcon name={tone === "warning" ? "alert" : "bell"} size={21} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-navy">
                        {notice.title}
                        {!notice.read && <span className="ml-2 inline-block h-2 w-2 rounded-full bg-brand align-middle" />}
                      </span>
                      <span className="block truncate text-xs text-muted">{notice.body}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-muted">
                        {formatRelativeNl(notice.created_at)}
                      </span>
                    </span>
                    <DashboardIcon name="chevron" size={17} className="shrink-0 text-muted" />
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <PanelHeading
              title="Claims afgelopen 30 dagen"
              action={
                <select
                  value={range}
                  onChange={(e) => setRange(Number(e.target.value) as ClaimsRange)}
                  className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy outline-none focus:border-brand"
                >
                  {RANGE_OPTIONS.map((opt) => (
                    <option key={opt.days} value={opt.days}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              }
            />
            {claimsError && (
              <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                <span>{claimsError}</span>
                <button type="button" onClick={() => void loadClaims()} className="underline">
                  Opnieuw
                </button>
              </div>
            )}
            {claimsLoading && <p className="py-10 text-center text-sm text-muted">Grafiek laden…</p>}
            {!claimsLoading && claims && (
              <>
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
                  <span className="h-2.5 w-2.5 rounded-full bg-brand" />
                  Geclaimde vouchers{" "}
                  <strong className="text-navy">
                    {maxClaims} piek · {formatCount(claims.totals.claims)} totaal
                  </strong>
                </div>
                <DashboardLineChart
                  values={chartValues}
                  id="merchant-claims"
                  labels={chartLabels}
                  dates={chartDates}
                  height={225}
                  onPointClick={(_i, date) => {
                    if (!date) return;
                    router.push(`/dashboard/offers?focus=claims&from=${encodeURIComponent(date)}&to=${encodeURIComponent(date)}`);
                  }}
                />
              </>
            )}
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeading
            title="Recente activiteit"
            description="Laatste gebeurtenissen in deze webshop."
          />
          {loading && <p className="py-6 text-center text-sm text-muted">Activiteit laden…</p>}
          {!loading && (dashboard?.recent_activity?.length ?? 0) === 0 && (
            <p className="py-6 text-center text-sm font-semibold text-muted">Nog geen activiteit.</p>
          )}
          <ul className="space-y-2">
            {(dashboard?.recent_activity ?? []).slice(0, 6).map((item, index) => (
              <li
                key={`${item.action}-${item.at}-${index}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-blue-50 px-3 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-navy">{activityLabel(item.action)}</span>
                  {item.resource_type && <span className="text-xs text-muted">{item.resource_type}</span>}
                </span>
                <span className="shrink-0 text-xs font-semibold text-muted">{formatRelativeNl(item.at)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="flex flex-col justify-between bg-gradient-to-br from-blue-50 to-white">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm">
              <DashboardIcon name="gift" size={23} />
            </span>
            <h3 className="mt-4 text-lg font-black text-navy">Meer bereik, meer klanten</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">
              Geef je aanbiedingen een boost en bereik shoppers die klaar zijn om te kopen.
            </p>
          </div>
          <Link href="/dashboard/analytics" className="mt-4 inline-flex items-center gap-2 font-extrabold text-brand hover:underline">
            Bekijk je analyse <DashboardIcon name="arrow" size={16} />
          </Link>
        </Panel>
      </div>
    </DashboardShell>
  );
}
