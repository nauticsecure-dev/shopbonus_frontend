"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, Panel, PanelHeading, StatusPill } from "@/components/DashboardPrimitives";
import { apiUrl, env } from "@/config/env";
import { ApiError } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import { listOffers, type OfferPayload } from "@/lib/merchantOffers";
import {
  DISPUTE_REASONS,
  disputeReasonLabel,
  disputeStatusLabel,
  exportVouchersUrl,
  fetchVoucher,
  formatVoucherDate,
  listDisputes,
  listVouchers,
  openVoucherDispute,
  redeemVoucher,
  redemptionSourceLabel,
  respondDispute,
  shortVoucherRef,
  voucherOriginLabel,
  voucherStatusLabel,
  type DisputeReason,
  type MerchantDispute,
  type MerchantVoucher,
  type MerchantVoucherDetail,
  type VoucherTerms,
} from "@/lib/merchantVouchers";
import { useShopBonus } from "@/store/ShopBonusContext";
import { useWorkspace } from "@/store/WorkspaceContext";

const PAGE_SIZE = 15;
const VOUCHER_STATUSES = ["reserved", "issued", "redeemed", "expired", "cancelled"] as const;

function discountLine(terms: VoucherTerms): string | null {
  if (terms.discount_type == null || terms.discount_value == null) return null;
  if (terms.discount_type === "percentage") {
    return `${(terms.discount_value / 100).toLocaleString("nl-NL", { maximumFractionDigits: 2 })}%`;
  }
  if (terms.discount_type === "fixed") return formatMinor(terms.discount_value);
  return null;
}

function TermsSnapshot({ terms }: { terms: VoucherTerms | null }) {
  if (!terms || (!terms.name && !terms.summary && !terms.public_description && terms.discount_value == null)) {
    return <p className="text-sm text-muted">Geen voorwaarden vastgelegd.</p>;
  }
  const discount = discountLine(terms);
  return (
    <dl className="space-y-2 text-sm">
      {terms.name && (
        <div>
          <dt className="text-xs font-bold text-muted">Naam</dt>
          <dd className="font-extrabold text-navy">{terms.name}</dd>
        </div>
      )}
      {terms.summary && (
        <div>
          <dt className="text-xs font-bold text-muted">Samenvatting</dt>
          <dd className="text-navy">{terms.summary}</dd>
        </div>
      )}
      {discount && (
        <div>
          <dt className="text-xs font-bold text-muted">Korting</dt>
          <dd className="font-extrabold text-navy">{discount}</dd>
        </div>
      )}
      {terms.min_order_minor != null && (
        <div>
          <dt className="text-xs font-bold text-muted">Minimale bestelling</dt>
          <dd className="text-navy">{formatMinor(terms.min_order_minor)}</dd>
        </div>
      )}
      {terms.public_description && (
        <div>
          <dt className="text-xs font-bold text-muted">Beschrijving</dt>
          <dd className="text-navy">{terms.public_description}</dd>
        </div>
      )}
      {(terms.claim_validity_days != null || terms.redemption_validity_days != null) && (
        <div>
          <dt className="text-xs font-bold text-muted">Geldigheid</dt>
          <dd className="text-navy">
            {terms.claim_validity_days != null ? `Claim ${terms.claim_validity_days} dagen` : ""}
            {terms.claim_validity_days != null && terms.redemption_validity_days != null ? " · " : ""}
            {terms.redemption_validity_days != null ? `Inwisselen ${terms.redemption_validity_days} dagen` : ""}
          </dd>
        </div>
      )}
    </dl>
  );
}

function MerchantVouchersPage() {
  const params = useSearchParams();
  const { pushToast } = useShopBonus();
  const { workspaceId, revision } = useWorkspace();
  const statusParam = params.get("status");
  const offerParam = params.get("offer");

  const [tab, setTab] = useState<"vouchers" | "disputes">(params.get("tab") === "disputes" ? "disputes" : "vouchers");
  const [offers, setOffers] = useState<OfferPayload[]>([]);
  const [rows, setRows] = useState<MerchantVoucher[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(
    statusParam && (VOUCHER_STATUSES as readonly string[]).includes(statusParam) ? statusParam : "all"
  );
  const [offerId, setOfferId] = useState(offerParam || "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const [disputes, setDisputes] = useState<MerchantDispute[]>([]);
  const [disputeStatus, setDisputeStatus] = useState("all");
  const [loadingDisputes, setLoadingDisputes] = useState(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const [detail, setDetail] = useState<MerchantVoucherDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeemReference, setRedeemReference] = useState("");
  const [redeemBusy, setRedeemBusy] = useState(false);
  const [disputeFor, setDisputeFor] = useState<MerchantVoucher | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("code_invalid");
  const [disputeText, setDisputeText] = useState("");
  const [disputeBusy, setDisputeBusy] = useState(false);
  const [respondFor, setRespondFor] = useState<MerchantDispute | null>(null);
  const [respondText, setRespondText] = useState("");
  const [respondBusy, setRespondBusy] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const loadVouchers = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const result = await listVouchers(
          workspaceId,
          {
            status: status === "all" ? undefined : status,
            offer: offerId === "all" ? undefined : offerId,
            search: debouncedSearch || undefined,
            from: from || undefined,
            to: to || undefined,
            page,
            per_page: PAGE_SIZE,
          },
          signal
        );
        if (signal?.aborted) return;
        setRows(result.data);
        setMeta({
          current_page: result.meta.current_page,
          last_page: result.meta.last_page,
          total: result.meta.total,
        });
      } catch (err) {
        if (signal?.aborted) return;
        setRows([]);
        setError(err instanceof ApiError ? err.message : "Vouchers konden niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [workspaceId, status, offerId, debouncedSearch, from, to, page]
  );

  const loadDisputeList = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingDisputes(true);
      setDisputeError(null);
      try {
        const data = await listDisputes(workspaceId, disputeStatus === "all" ? undefined : disputeStatus, signal);
        if (!signal?.aborted) setDisputes(data);
      } catch (err) {
        if (signal?.aborted) return;
        setDisputes([]);
        setDisputeError(err instanceof ApiError ? err.message : "Geschillen konden niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoadingDisputes(false);
      }
    },
    [workspaceId, disputeStatus]
  );

  useEffect(() => {
    const ac = new AbortController();
    void listOffers(workspaceId)
      .then((data) => {
        if (!ac.signal.aborted) setOffers(data);
      })
      .catch(() => {
        if (!ac.signal.aborted) setOffers([]);
      });
    return () => ac.abort();
  }, [workspaceId, revision]);

  useEffect(() => {
    const ac = new AbortController();
    void loadVouchers(ac.signal);
    return () => ac.abort();
  }, [loadVouchers, revision]);

  useEffect(() => {
    if (tab !== "disputes") return;
    const ac = new AbortController();
    void loadDisputeList(ac.signal);
    return () => ac.abort();
  }, [tab, loadDisputeList, revision]);

  const openDetail = async (row: MerchantVoucher) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchVoucher(workspaceId, row.id);
      setDetail(data);
    } catch (err) {
      pushToast({
        title: "Voucher niet geladen",
        message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      const path = exportVouchersUrl(workspaceId, {
        status: status === "all" ? undefined : status,
        offer: offerId === "all" ? undefined : offerId,
        search: debouncedSearch || undefined,
        from: from || undefined,
        to: to || undefined,
      });
      const res = await fetch(apiUrl(path), {
        credentials: env.useCookieAuth ? "include" : "same-origin",
        headers: { Accept: "text/csv" },
      });
      if (!res.ok) throw new Error("Export geweigerd");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "shopbonus-vouchers.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast({ title: "Export gestart", message: "Gefilterde vouchers gedownload.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Export mislukt",
        message: err instanceof Error ? err.message : "Geen exportrechten of serverfout.",
        kind: "error",
      });
    }
  };

  const submitRedeem = async (event: FormEvent) => {
    event.preventDefault();
    const code = redeemCode.trim();
    if (!code) return;
    setRedeemBusy(true);
    try {
      const result = await redeemVoucher(workspaceId, {
        code,
        reference: redeemReference.trim() || undefined,
      });
      pushToast({
        title: "Voucher ingewisseld",
        message: `${shortVoucherRef(result.voucher_id)} · ${voucherStatusLabel(result.status)}`,
        kind: "success",
      });
      setRedeemOpen(false);
      setRedeemCode("");
      setRedeemReference("");
      await loadVouchers();
    } catch (err) {
      pushToast({
        title: "Inwisselen mislukt",
        message: err instanceof ApiError ? err.message : "Controleer de code.",
        kind: "error",
      });
    } finally {
      setRedeemBusy(false);
    }
  };

  const submitDispute = async (event: FormEvent) => {
    event.preventDefault();
    if (!disputeFor) return;
    if (disputeText.trim().length < 10) {
      pushToast({ title: "Beschrijving te kort", message: "Minimaal 10 tekens.", kind: "error" });
      return;
    }
    setDisputeBusy(true);
    try {
      await openVoucherDispute(workspaceId, disputeFor.id, {
        reason: disputeReason,
        description: disputeText.trim(),
      });
      pushToast({ title: "Geschil geopend", message: shortVoucherRef(disputeFor.id), kind: "success" });
      setDisputeFor(null);
      setDisputeText("");
      setTab("disputes");
    } catch (err) {
      pushToast({
        title: "Geschil niet geopend",
        message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    } finally {
      setDisputeBusy(false);
    }
  };

  const submitRespond = async (event: FormEvent) => {
    event.preventDefault();
    if (!respondFor) return;
    if (respondText.trim().length < 5) {
      pushToast({ title: "Reactie te kort", message: "Minimaal 5 tekens.", kind: "error" });
      return;
    }
    setRespondBusy(true);
    try {
      const updated = await respondDispute(workspaceId, respondFor.id, respondText.trim());
      setDisputes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setRespondFor(updated);
      setRespondText("");
      pushToast({ title: "Reactie verstuurd", message: disputeStatusLabel(updated.status), kind: "success" });
    } catch (err) {
      pushToast({
        title: "Reageren mislukt",
        message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    } finally {
      setRespondBusy(false);
    }
  };

  const modalOpen = detailLoading || detail || redeemOpen || disputeFor || respondFor;

  return (
    <DashboardShell>
      <DashboardHeading
        title="Vouchers"
        accent="beheren"
        subtitle="Uitgegeven vouchers van deze webshop. Geen klantgegevens."
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRedeemOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-3.5 font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(11,116,255,0.7)] hover:bg-brand-dark"
            >
              <DashboardIcon name="check" size={18} /> Code inwisselen
            </button>
            <button
              type="button"
              onClick={() => void exportCsv()}
              className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-white px-5 py-3.5 font-extrabold text-brand hover:bg-blue-50"
            >
              <DashboardIcon name="download" size={18} /> CSV exporteren
            </button>
          </div>
        }
      />

      <div className="mb-5 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("vouchers")}
          className={`rounded-xl px-4 py-2.5 text-sm font-extrabold ${
            tab === "vouchers" ? "bg-brand text-white" : "border border-blue-100 bg-white text-navy"
          }`}
        >
          Overzicht
        </button>
        <button
          type="button"
          onClick={() => setTab("disputes")}
          className={`rounded-xl px-4 py-2.5 text-sm font-extrabold ${
            tab === "disputes" ? "bg-brand text-white" : "border border-blue-100 bg-white text-navy"
          }`}
        >
          Geschillen
        </button>
      </div>

      {tab === "vouchers" && (
        <>
          <div className="mb-4 grid gap-2 lg:grid-cols-[minmax(180px,1.3fr)_repeat(4,minmax(120px,.7fr))]">
            <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-muted shadow-sm">
              <DashboardIcon name="search" size={18} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Zoek op code (laatste 4) of aanbieding…"
                className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted/75"
              />
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
              aria-label="Filter status"
            >
              <option value="all">Alle statussen</option>
              {VOUCHER_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {voucherStatusLabel(value)}
                </option>
              ))}
            </select>
            <select
              value={offerId}
              onChange={(e) => {
                setOfferId(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
              aria-label="Filter aanbieding"
            >
              <option value="all">Alle aanbiedingen</option>
              {offers.map((offer) => (
                <option key={offer.id} value={offer.id}>
                  {offer.terms.name}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
              aria-label="Uitgegeven vanaf"
            />
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
              aria-label="Uitgegeven tot"
            />
          </div>

          {error && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              <p className="font-semibold">{error}</p>
              <button type="button" onClick={() => void loadVouchers()} className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold">
                Opnieuw proberen
              </button>
            </div>
          )}

          <Panel className="p-0">
            <div className="border-b border-blue-50 px-4 py-4 sm:px-5">
              <h2 className="font-black text-navy">Uitgegeven vouchers</h2>
              <p className="text-sm text-muted">Codes zijn gemaskeerd. Klantgegevens worden niet getoond.</p>
            </div>

            {loading && (
              <p className="px-5 py-10 text-center text-sm font-semibold text-muted" role="status">
                Vouchers laden…
              </p>
            )}

            {!loading && !error && rows.length === 0 && (
              <div className="px-5 py-12 text-center">
                <p className="font-extrabold text-navy">Geen vouchers</p>
                <p className="mt-1 text-sm text-muted">Er zijn geen vouchers voor deze filters.</p>
                <Link href="/dashboard/offers?new=1" className="mt-4 inline-flex rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white">
                  Nieuwe aanbieding
                </Link>
              </div>
            )}

            {!loading && rows.length > 0 && (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="bg-blue-50/70 text-xs font-extrabold text-muted">
                        <th className="px-4 py-3">Aanbieding</th>
                        <th className="px-3 py-3">Referentie</th>
                        <th className="px-3 py-3">Code</th>
                        <th className="px-3 py-3">Uitgegeven</th>
                        <th className="px-3 py-3">Geldig tot</th>
                        <th className="px-3 py-3">Status</th>
                        <th className="px-3 py-3">Ingewisseld</th>
                        <th className="px-4 py-3 text-right">Acties</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.id} className="border-b border-blue-50 last:border-0">
                          <td className="px-4 py-3">
                            <p className="font-extrabold text-navy">{row.offer_name ?? "Aanbieding"}</p>
                            <p className="text-xs text-muted">{voucherOriginLabel(row.origin)}</p>
                          </td>
                          <td className="px-3 py-3 font-bold tracking-wide text-navy">{shortVoucherRef(row.id)}</td>
                          <td className="px-3 py-3 font-mono text-navy">{row.code ?? "—"}</td>
                          <td className="px-3 py-3 text-muted">{formatVoucherDate(row.issued_at)}</td>
                          <td className="px-3 py-3 text-muted">{formatVoucherDate(row.expires_at)}</td>
                          <td className="px-3 py-3">
                            <StatusPill status={voucherStatusLabel(row.status)} />
                          </td>
                          <td className="px-3 py-3 text-muted">{formatVoucherDate(row.redeemed_at)}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => void openDetail(row)}
                                className="text-sm font-extrabold text-brand hover:underline"
                              >
                                Bekijk
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDisputeReason("code_invalid");
                                  setDisputeText("");
                                  setDisputeFor(row);
                                }}
                                className="text-sm font-extrabold text-muted hover:text-navy"
                              >
                                Geschil
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="space-y-3 p-3 md:hidden">
                  {rows.map((row) => (
                    <article key={row.id} className="rounded-2xl border border-blue-50 bg-slate-50/60 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-extrabold text-navy">{row.offer_name ?? "Aanbieding"}</p>
                          <p className="font-mono text-sm text-navy">{row.code ?? "—"}</p>
                          <p className="text-xs text-muted">Ref {shortVoucherRef(row.id)}</p>
                        </div>
                        <StatusPill status={voucherStatusLabel(row.status)} />
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Uitgegeven {formatVoucherDate(row.issued_at)} · tot {formatVoucherDate(row.expires_at)}
                      </p>
                      <div className="mt-3 flex gap-3">
                        <button type="button" onClick={() => void openDetail(row)} className="text-sm font-extrabold text-brand">
                          Bekijk
                        </button>
                        <button type="button" onClick={() => setDisputeFor(row)} className="text-sm font-extrabold text-muted">
                          Geschil
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center justify-between border-t border-blue-50 px-4 py-4 text-sm text-muted sm:px-5">
              <span>{meta.total.toLocaleString("nl-NL")} vouchers</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={meta.current_page <= 1}
                  onClick={() => setPage((n) => Math.max(1, n - 1))}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 disabled:opacity-40"
                >
                  <DashboardIcon name="chevron" size={16} className="rotate-180" />
                </button>
                <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-blue-50 px-3 font-extrabold text-brand">
                  {meta.current_page}
                </span>
                <button
                  type="button"
                  disabled={meta.current_page >= meta.last_page}
                  onClick={() => setPage((n) => n + 1)}
                  className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 disabled:opacity-40"
                >
                  <DashboardIcon name="chevron" size={16} />
                </button>
              </div>
            </div>
          </Panel>
        </>
      )}

      {tab === "disputes" && (
        <Panel>
          <PanelHeading
            title="Geschillen"
            description="Meldingen over vouchers van deze webshop. Zonder klantnaam of e-mail."
            action={
              <select
                value={disputeStatus}
                onChange={(e) => setDisputeStatus(e.target.value)}
                className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy outline-none focus:border-brand"
                aria-label="Filter geschilstatus"
              >
                <option value="all">Alle statussen</option>
                <option value="open">Open</option>
                <option value="under_review">In behandeling</option>
                <option value="waiting_for_merchant">Wacht op webshop</option>
                <option value="resolved">Opgelost</option>
                <option value="rejected">Afgewezen</option>
              </select>
            }
          />
          {disputeError && <p className="mb-3 text-sm font-semibold text-red-700">{disputeError}</p>}
          {loadingDisputes && <p className="py-8 text-center text-sm text-muted">Geschillen laden…</p>}
          {!loadingDisputes && disputes.length === 0 && (
            <p className="py-8 text-center text-sm font-semibold text-muted">Geen geschillen.</p>
          )}
          <div className="space-y-3">
            {disputes.map((dispute) => (
              <article key={dispute.id} className="rounded-2xl border border-blue-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-extrabold text-navy">{disputeReasonLabel(dispute.reason)}</p>
                    <p className="mt-1 text-sm text-navy">{dispute.description}</p>
                    <p className="mt-2 text-xs text-muted">
                      {dispute.voucher_id ? `Voucher ${shortVoucherRef(dispute.voucher_id)}` : "Geen voucher"}
                      {dispute.code_last4 ? ` · ****${dispute.code_last4}` : ""} · {formatVoucherDate(dispute.created_at)}
                      {dispute.has_screenshot ? " · Screenshot aanwezig" : ""}
                    </p>
                  </div>
                  <StatusPill status={disputeStatusLabel(dispute.status)} />
                </div>
                {dispute.resolution?.note && (
                  <p className="mt-2 text-xs font-semibold text-muted">Afhandeling: {dispute.resolution.note}</p>
                )}
                {dispute.status !== "resolved" && dispute.status !== "rejected" && (
                  <button
                    type="button"
                    onClick={() => {
                      setRespondText("");
                      setRespondFor(dispute);
                    }}
                    className="mt-3 text-sm font-extrabold text-brand hover:underline"
                  >
                    Reageren
                  </button>
                )}
              </article>
            ))}
          </div>
        </Panel>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-navy/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target !== e.currentTarget) return;
            setDetail(null);
            setRedeemOpen(false);
            setDisputeFor(null);
            setRespondFor(null);
          }}
        >
          <div className="my-8 w-full max-w-lg rounded-[1.6rem] border border-blue-100 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">Vouchers</p>
                <h2 className="mt-1 text-2xl font-black text-navy">
                  {detailLoading
                    ? "Voucher laden"
                    : detail
                      ? "Voucherdetail"
                      : redeemOpen
                        ? "Code inwisselen"
                        : disputeFor
                          ? "Geschil openen"
                          : "Reageren"}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetail(null);
                  setRedeemOpen(false);
                  setDisputeFor(null);
                  setRespondFor(null);
                }}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-muted"
                aria-label="Sluiten"
              >
                <DashboardIcon name="close" size={18} />
              </button>
            </div>

            {detailLoading && <p className="mt-5 text-sm text-muted">Gegevens ophalen…</p>}

            {detail && (
              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-lg font-black text-navy">{detail.code ?? "—"}</p>
                  <StatusPill status={voucherStatusLabel(detail.status)} />
                </div>
                <p className="text-sm text-muted">
                  {detail.offer_name ?? "Aanbieding"} · ref {shortVoucherRef(detail.id)} · {voucherOriginLabel(detail.origin)}
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-blue-50/70 p-3">
                    <p className="text-xs text-muted">Uitgegeven</p>
                    <p className="font-bold text-navy">{formatVoucherDate(detail.issued_at)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50/70 p-3">
                    <p className="text-xs text-muted">Geldig tot</p>
                    <p className="font-bold text-navy">{formatVoucherDate(detail.expires_at)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50/70 p-3">
                    <p className="text-xs text-muted">Ingewisseld</p>
                    <p className="font-bold text-navy">{formatVoucherDate(detail.redeemed_at)}</p>
                  </div>
                  <div className="rounded-xl bg-blue-50/70 p-3">
                    <p className="text-xs text-muted">Bron</p>
                    <p className="font-bold text-navy">{redemptionSourceLabel(detail.redemption_source)}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-100 p-4">
                  <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-brand">Voorwaarden</p>
                  <TermsSnapshot terms={detail.terms} />
                </div>
              </div>
            )}

            {redeemOpen && !detail && (
              <form onSubmit={(e) => void submitRedeem(e)} className="mt-5 space-y-4">
                <p className="text-sm text-muted">Controleer de code aan de kassa. De volledige code wordt niet in het overzicht getoond.</p>
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy" htmlFor="redeem-code">
                    Code
                  </label>
                  <input
                    id="redeem-code"
                    value={redeemCode}
                    onChange={(e) => setRedeemCode(e.target.value)}
                    required
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 font-mono text-navy outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy" htmlFor="redeem-ref">
                    Referentie (optioneel)
                  </label>
                  <input
                    id="redeem-ref"
                    value={redeemReference}
                    onChange={(e) => setRedeemReference(e.target.value)}
                    maxLength={120}
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                  />
                </div>
                <button
                  type="submit"
                  disabled={redeemBusy}
                  className="w-full rounded-xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {redeemBusy ? "Bezig…" : "Inwisselen"}
                </button>
              </form>
            )}

            {disputeFor && (
              <form onSubmit={(e) => void submitDispute(e)} className="mt-5 space-y-4">
                <p className="text-sm text-muted">
                  {disputeFor.offer_name ?? "Voucher"} · {disputeFor.code ?? shortVoucherRef(disputeFor.id)}
                </p>
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy" htmlFor="dispute-reason">
                    Reden
                  </label>
                  <select
                    id="dispute-reason"
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                    className="w-full rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-semibold text-navy outline-none focus:border-brand"
                  >
                    {DISPUTE_REASONS.map((reason) => (
                      <option key={reason.value} value={reason.value}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy" htmlFor="dispute-text">
                    Beschrijving
                  </label>
                  <textarea
                    id="dispute-text"
                    value={disputeText}
                    onChange={(e) => setDisputeText(e.target.value)}
                    rows={4}
                    minLength={10}
                    maxLength={2000}
                    required
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                  />
                  <p className="mt-1 text-xs text-muted">Minimaal 10 tekens. Geen klantgegevens nodig.</p>
                </div>
                <button
                  type="submit"
                  disabled={disputeBusy}
                  className="w-full rounded-xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  {disputeBusy ? "Bezig…" : "Geschil openen"}
                </button>
              </form>
            )}

            {respondFor && !disputeFor && (
              <form onSubmit={(e) => void submitRespond(e)} className="mt-5 space-y-4">
                <p className="text-sm text-navy">{respondFor.description}</p>
                <StatusPill status={disputeStatusLabel(respondFor.status)} />
                {respondFor.timeline && respondFor.timeline.length > 0 && (
                  <ul className="max-h-40 space-y-2 overflow-y-auto text-sm">
                    {respondFor.timeline.map((event, index) => (
                      <li key={`${event.at}-${index}`} className="rounded-xl border border-blue-50 px-3 py-2">
                        <p className="font-extrabold text-navy">{event.type}</p>
                        {event.note && <p className="text-muted">{event.note}</p>}
                        <p className="text-xs text-muted">{formatVoucherDate(event.at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {respondFor.status !== "resolved" && respondFor.status !== "rejected" && (
                  <>
                    <textarea
                      value={respondText}
                      onChange={(e) => setRespondText(e.target.value)}
                      rows={4}
                      minLength={5}
                      maxLength={2000}
                      required
                      placeholder="Je reactie"
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                    />
                    <button
                      type="submit"
                      disabled={respondBusy}
                      className="w-full rounded-xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                    >
                      {respondBusy ? "Bezig…" : "Verstuur reactie"}
                    </button>
                  </>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default function VouchersPage() {
  return (
    <Suspense fallback={<p className="p-8 text-muted">Vouchers laden…</p>}>
      <MerchantVouchersPage />
    </Suspense>
  );
}
