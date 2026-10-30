"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { listOffers, type OfferPayload } from "@/lib/onboarding";
import {
  ApiError,
  BRANCH_OFFER_PREVIEWS,
  bannerStatusLabel,
  createBanner,
  defaultBannerConfig,
  duplicateBanner,
  embedScriptUrl,
  fetchBannerInstallation,
  fetchBannerResults,
  formatCtr,
  formatMinor,
  listBanners,
  merchantCostFromReward,
  pauseBanner,
  publishBanner,
  templateLabel,
  updateBannerInstallation,
  type BannerCampaignSummary,
  type BannerInstallation,
  type BannerResults,
} from "@/lib/banners";

export default function BannerCampaignOverviewPage() {
  const { workspaceId, revision, current } = useWorkspace();
  const [banners, setBanners] = useState<BannerCampaignSummary[]>([]);
  const [offers, setOffers] = useState<OfferPayload[]>([]);
  const [installation, setInstallation] = useState<BannerInstallation | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [placement, setPlacement] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [results, setResults] = useState<BannerResults | null>(null);
  const [name, setName] = useState("Spend €100 · earn €10");
  const [offerId, setOfferId] = useState("");
  const [originDraft, setOriginDraft] = useState("");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const [rows, offerRows, install] = await Promise.all([
          listBanners(workspaceId, { search: search || undefined, status: status || undefined, placement: placement || undefined }, signal),
          listOffers(workspaceId),
          fetchBannerInstallation(workspaceId, signal),
        ]);
        if (signal?.aborted) return;
        setBanners(rows);
        setOffers(offerRows ?? []);
        setInstallation(install);
        setOriginDraft((install.allowed_origins || []).join("\n"));
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Campaigns could not be loaded.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [workspaceId, search, status, placement]
  );

  useEffect(() => {
    const ac = new AbortController();
    const t = window.setTimeout(() => void load(ac.signal), 200);
    return () => {
      window.clearTimeout(t);
      ac.abort();
    };
  }, [load, revision]);

  useEffect(() => {
    if (!selectedId) {
      setResults(null);
      return;
    }
    const ac = new AbortController();
    void fetchBannerResults(workspaceId, selectedId, {}, ac.signal)
      .then(setResults)
      .catch(() => setResults(null));
    return () => ac.abort();
  }, [selectedId, workspaceId, revision]);

  const selected = useMemo(() => banners.find((b) => b.id === selectedId) ?? null, [banners, selectedId]);

  const onCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const origin = installation?.allowed_origins?.[0] || "https://example.nl";
      const row = await createBanner(workspaceId, {
        name: name.trim() || "Banner campaign",
        offer_id: offerId || null,
        config: defaultBannerConfig(origin),
      });
      await load();
      setSelectedId(row.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create draft.");
    } finally {
      setBusy(false);
    }
  };

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveOrigins = async () => {
    const origins = originDraft
      .split(/\n|,/)
      .map((s) => s.trim())
      .filter(Boolean);
    await run(async () => setInstallation(await updateBannerInstallation(workspaceId, origins)));
  };

  const healthLabel =
    installation?.status === "installed"
      ? "Embed healthy"
      : installation?.status === "stale"
        ? "Embed stale — reopen a page on your shop"
        : "Embed not seen yet — add the snippet";

  return (
    <DashboardShell>
      <DashboardHeading
        title="Banner Studio"
        subtitle="Campaign overview · live editor on your real webshop · no reinstall for changes"
      />

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      ) : null}

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1 text-xs font-extrabold text-muted">
              Search
              <input
                data-testid="banner-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name"
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-semibold"
              />
            </label>
            <label className="text-xs font-extrabold text-muted">
              Status
              <select
                data-testid="banner-status-filter"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold"
              >
                <option value="">All</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="paused">Paused</option>
              </select>
            </label>
            <label className="text-xs font-extrabold text-muted">
              Placement
              <select
                value={placement}
                onChange={(e) => setPlacement(e.target.value)}
                className="mt-1 block rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold"
              >
                <option value="">All</option>
                <option value="top">Top ribbon</option>
                <option value="bottom_right">Bottom right</option>
                <option value="inline">Inline</option>
              </select>
            </label>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm" data-testid="campaign-table">
              <thead>
                <tr className="border-b border-blue-50 text-[11px] font-extrabold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-2">Campaign</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Location</th>
                  <th className="py-2 pr-2">Updated</th>
                  <th className="py-2 pr-2">Impr.</th>
                  <th className="py-2 pr-2">CTA</th>
                  <th className="py-2 pr-2">CTR</th>
                  <th className="py-2 pr-2">Orders</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center font-semibold text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : banners.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center font-semibold text-muted">
                      No campaigns yet. Create a draft with a verified offer.
                    </td>
                  </tr>
                ) : (
                  banners.map((b) => (
                    <tr
                      key={b.id}
                      data-testid={`campaign-row-${b.id}`}
                      className={`cursor-pointer border-b border-blue-50/80 ${selectedId === b.id ? "bg-brand-light/50" : "hover:bg-mist/60"}`}
                      onClick={() => setSelectedId(b.id)}
                    >
                      <td className="py-3 pr-2">
                        <p className="font-extrabold text-navy">{b.name}</p>
                        <p className="text-[11px] font-semibold text-muted">{templateLabel(b.template || "")}</p>
                      </td>
                      <td className="py-3 pr-2">
                        <StatusPill status={bannerStatusLabel(b.status)} />
                      </td>
                      <td className="py-3 pr-2 font-semibold text-muted">{b.placement ?? "—"}</td>
                      <td className="py-3 pr-2 text-xs font-semibold text-muted">
                        {b.updated_at ? new Date(b.updated_at).toLocaleDateString("nl-NL") : "—"}
                      </td>
                      <td className="py-3 pr-2 font-bold">{b.stats_30d?.viewable_impressions ?? 0}</td>
                      <td className="py-3 pr-2 font-bold">{b.stats_30d?.cta_clicks ?? 0}</td>
                      <td className="py-3 pr-2 font-bold">{formatCtr(b.stats_30d?.ctr)}</td>
                      <td className="py-3 pr-2 font-bold">{b.stats_30d?.attributed_orders ?? 0}</td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href={`/dashboard/banners/${b.id}/studio`}
                            className="rounded-lg bg-brand px-2 py-1 text-[11px] font-extrabold text-white"
                            data-testid={`edit-on-website-${b.id}`}
                          >
                            Edit on website
                          </Link>
                          <button
                            type="button"
                            disabled={busy}
                            className="rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px] font-bold"
                            onClick={() => void run(() => duplicateBanner(workspaceId, b.id))}
                          >
                            Duplicate
                          </button>
                          {b.status === "live" ? (
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px] font-bold"
                              onClick={() => void run(() => pauseBanner(workspaceId, b.id))}
                            >
                              Pause
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={busy}
                              className="rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px] font-bold"
                              onClick={() => void run(() => publishBanner(workspaceId, b.id))}
                            >
                              Publish
                            </button>
                          )}
                          <button
                            type="button"
                            className="rounded-lg border border-blue-100 bg-white px-2 py-1 text-[11px] font-bold"
                            onClick={() => setSelectedId(b.id)}
                          >
                            Results
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <h2 className="text-lg font-black text-navy">New campaign</h2>
            <p className="mt-1 text-sm font-semibold text-muted">
              Presentation only — eligibility and cost stay with offers, wallet and funding.
            </p>
            <div className="mt-3 grid gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-semibold"
                placeholder="Campaign name"
              />
              <select
                value={offerId}
                onChange={(e) => setOfferId(e.target.value)}
                className="rounded-xl border border-blue-100 px-3 py-2.5 text-sm font-bold"
              >
                <option value="">No linked offer</option>
                {offers.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.terms?.name || o.id} ({o.status})
                  </option>
                ))}
              </select>
              <button
                type="button"
                data-testid="create-banner"
                disabled={busy}
                onClick={() => void onCreate()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
              >
                <DashboardIcon name="plus" size={16} />
                Create draft
              </button>
            </div>
            <div className="mt-4 space-y-2 rounded-xl border border-blue-100 bg-mist/50 p-3 text-xs font-semibold text-navy">
              <p className="font-extrabold">Branch offer defaults (preview)</p>
              {BRANCH_OFFER_PREVIEWS.map((b) => {
                const cost = merchantCostFromReward(b.reward_minor);
                return (
                  <p key={b.key}>
                    {b.category}: threshold {formatMinor(b.threshold_minor)} → reward {formatMinor(b.reward_minor)} ·
                    merchant cost {formatMinor(cost.total_minor)}
                  </p>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-black text-navy">Results</h2>
            {!selected ? (
              <p className="mt-2 text-sm font-semibold text-muted">Select a campaign to open results.</p>
            ) : (
              <div className="mt-3" data-testid="results-panel">
                <p className="font-extrabold text-navy">{selected.name}</p>
                <p className="text-xs font-semibold text-muted">
                  {bannerStatusLabel(selected.status)} · {selected.placement || "—"}
                </p>
                {results ? (
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <Stat label="Eligible" value={results.eligible} />
                    <Stat label="Viewable impressions" value={results.viewable_impressions} />
                    <Stat label="CTA clicks" value={results.cta_clicks} />
                    <Stat label="Dismissals (X ≠ CTA)" value={results.dismissals} />
                    <Stat label="CTR" value={formatCtr(results.ctr)} />
                    <Stat label="Attributed orders" value={results.attributed_orders ?? 0} />
                  </dl>
                ) : (
                  <p className="mt-2 text-sm font-semibold text-muted">Loading results…</p>
                )}
                <Link
                  href={`/dashboard/banners/${selected.id}/studio`}
                  className="mt-3 inline-flex rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white"
                >
                  Edit on my website
                </Link>
              </div>
            )}
          </Panel>

          <Panel>
            <h2 className="text-lg font-black text-navy">Installation</h2>
            <p className="mt-1 text-sm font-semibold text-muted" data-testid="install-health">
              {healthLabel}
              {installation?.last_seen ? ` · last seen ${installation.last_seen.origin}` : ""}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted">
              One async script per verified domain. Shopify needs an authorized Theme App Embed; other platforms use the
              approved snippet. Embed capability is reported per connector as Available / Limited / Unsupported.
            </p>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] text-emerald-200">
              {installation?.snippet || `<script async src="${embedScriptUrl()}" data-shopbonus-key="pk_…"></script>`}
            </pre>
            <label className="mt-3 block text-xs font-extrabold text-muted">
              Allowed origins (https, verified domain)
              <textarea
                value={originDraft}
                onChange={(e) => setOriginDraft(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2 text-sm font-semibold"
              />
            </label>
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveOrigins()}
              className="mt-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-extrabold"
            >
              Save origins & check installation
            </button>
            <p className="mt-2 text-[11px] font-semibold text-muted">
              Workspace: {current?.name ?? workspaceId}. Missing/duplicate script, CSP blocks or API outages surface here —
              they never break the webshop.
            </p>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-blue-100 bg-mist/40 px-3 py-2">
      <dt className="text-[10px] font-extrabold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="text-base font-black text-navy">{value}</dd>
    </div>
  );
}
