"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Eyebrow } from "@/components/Cards";
import SupportChatPanel from "@/components/SupportChatPanel";
import { ApiError } from "@/lib/api";
import {
  createDispute,
  fetchAffiliateActivity,
  fetchTransaction,
  fetchTransactions,
  fetchVoucherDetail,
  type AffiliateActivityItem,
  type ConsumerVoucher,
  type DisputeReason,
  type LedgerEntry,
  type LedgerFilter,
} from "@/lib/benefits";
import { fetchConsumerDashboard, type ConsumerDashboard } from "@/lib/dashboard";
import { formatMinor, formatNlDate } from "@/lib/money";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

type VoucherFilter = "alle" | "actief" | "used" | "verlopen" | "geannuleerd";
type TxFilter = "all" | "earned" | "spent" | "pending" | "adjustments";
type BenefitsTab = "vouchers" | "transacties" | "aankopen";

const DISPUTE_REASONS: { value: DisputeReason; label: string }[] = [
  { value: "code_invalid", label: "Code ongeldig bij afrekenen" },
  { value: "code_already_used", label: "Code al gebruikt" },
  { value: "refused_by_webshop", label: "Webshop weigert geldige code" },
  { value: "terms_differ", label: "Korting wijkt af van voorwaarden" },
  { value: "missing_after_payment", label: "Betaald maar voucher ontbreekt" },
  { value: "other", label: "Anders" },
];

function statusUi(status: string): { label: string; active: boolean; used: boolean } {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return { label: "Actief", active: true, used: false };
  if (s === "USED") return { label: "Gebruikt", active: false, used: true };
  if (s === "CANCELLED") return { label: "Geannuleerd", active: false, used: false };
  return { label: "Verlopen", active: false, used: false };
}

function discountLabel(v: ConsumerVoucher): string {
  if (v.discount_type === "percentage" || v.discount_type === "percent") {
    const n = v.discount_value ?? 0;
    return `${Number.isInteger(n) ? n : n.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;
  }
  if (typeof v.discount_value === "number") {
    // Fixed offers store cents in terms snapshots.
    if (v.discount_type === "fixed" || v.discount_type === "amount" || v.discount_value >= 100) {
      return formatMinor(v.discount_value);
    }
    return `€${v.discount_value}`;
  }
  return "—";
}

function logoInitials(name: string | null | undefined): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "S";
}

export default function MijnVoordelenPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-muted" role="status">
          Mijn voordelen laden…
        </div>
      }
    >
      <MijnVoordelenInner />
    </Suspense>
  );
}

function MijnVoordelenInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useLocale();
  const { session, ready: sessionReady } = useSession();
  const {
    availableMinor,
    pendingCashbackMinor,
    reservedMinor,
    totalEarnedMinor,
    totalSpentMinor,
    savingsGoal,
    walletReady,
    walletError,
    apiMode,
    apiVouchers,
    vouchers: demoVouchers,
    transactions: demoTransactions,
    refreshWallet,
    refreshVouchers,
    revealAndCopyVoucher,
    justCopied,
    pushToast,
  } = useShopBonus();

  const tabParam = searchParams.get("tab");
  const initialTab: BenefitsTab =
    tabParam === "transacties" || tabParam === "aankopen" || tabParam === "vouchers"
      ? tabParam
      : "vouchers";
  const [tab, setTab] = useState<BenefitsTab>(initialTab);
  const [filter, setFilter] = useState<VoucherFilter>("alle");
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [txQuery, setTxQuery] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerMeta, setLedgerMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [selectedTx, setSelectedTx] = useState<LedgerEntry | null>(null);
  const [affiliateRows, setAffiliateRows] = useState<AffiliateActivityItem[]>([]);
  const [affiliateNotice, setAffiliateNotice] = useState<string | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportVoucher, setSupportVoucher] = useState<ConsumerVoucher | null>(null);
  const [conditionsId, setConditionsId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<ConsumerDashboard | null>(null);
  const [detail, setDetail] = useState<ConsumerVoucher | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [disputeVoucher, setDisputeVoucher] = useState<ConsumerVoucher | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>("code_invalid");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [disputeScreenshot, setDisputeScreenshot] = useState<File | null>(null);
  const [disputeBusy, setDisputeBusy] = useState(false);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session) {
      router.replace(`/account?mode=login&next=${encodeURIComponent("/mijn-voordelen")}`);
    }
  }, [sessionReady, session, router]);

  useEffect(() => {
    const next =
      tabParam === "transacties" || tabParam === "aankopen" || tabParam === "vouchers"
        ? tabParam
        : null;
    if (next && next !== tab) setTab(next);
  }, [tabParam, tab]);

  useEffect(() => {
    if (!session?.user || !apiMode) return;
    let cancelled = false;
    void fetchConsumerDashboard(locale)
      .then((data) => {
        if (!cancelled) setDashboard(data);
      })
      .catch(() => {
        if (!cancelled) setDashboard(null);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user, apiMode, locale]);

  const loadLedger = useCallback(async () => {
    if (!apiMode) return;
    setLedgerLoading(true);
    try {
      const res = await fetchTransactions(
        {
          filter: txFilter as LedgerFilter,
          q: txQuery.trim() || undefined,
          page: txPage,
          per_page: 25,
        },
        locale
      );
      setLedger(res.data);
      setLedgerMeta(res.meta);
    } catch (err) {
      pushToast({
        title: "Transacties laden mislukt",
        message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
        kind: "error",
      });
    } finally {
      setLedgerLoading(false);
    }
  }, [apiMode, txFilter, txQuery, txPage, locale, pushToast]);

  useEffect(() => {
    if (tab === "transacties" && apiMode) void loadLedger();
  }, [tab, apiMode, loadLedger]);

  useEffect(() => {
    if (tab !== "aankopen" || !apiMode) return;
    let cancelled = false;
    setAffiliateLoading(true);
    void fetchAffiliateActivity(locale)
      .then((res) => {
        if (cancelled) return;
        setAffiliateRows(res.data);
        setAffiliateNotice(res.notice ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          pushToast({
            title: "Affiliate-activiteit laden mislukt",
            message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
            kind: "error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setAffiliateLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, apiMode, locale, pushToast]);

  useEffect(() => {
    if (!apiMode) return;
    const apiFilter =
      filter === "actief"
        ? "active"
        : filter === "used"
          ? "used"
          : filter === "verlopen"
            ? "expired"
            : filter === "geannuleerd"
              ? "cancelled"
              : "all";
    void refreshVouchers(apiFilter === "all" ? "all" : apiFilter);
  }, [filter, apiMode, refreshVouchers]);

  const openDetail = useCallback(
    async (id: string) => {
      if (!apiMode) return;
      setDetailLoading(true);
      try {
        const v = await fetchVoucherDetail(id, locale);
        setDetail(v);
      } catch (err) {
        pushToast({
          title: "Details laden mislukt",
          message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
          kind: "error",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [apiMode, locale, pushToast]
  );

  useEffect(() => {
    const focus = searchParams.get("voucher");
    if (focus && apiMode && session?.user) {
      setTab("vouchers");
      void openDetail(focus);
    }
  }, [searchParams, apiMode, session?.user, openDetail]);

  const shownApi = useMemo(() => {
    if (filter === "alle") return apiVouchers;
    if (filter === "actief") return apiVouchers.filter((v) => v.status === "ACTIVE");
    if (filter === "used") return apiVouchers.filter((v) => v.status === "USED");
    if (filter === "geannuleerd") return apiVouchers.filter((v) => v.status === "CANCELLED");
    return apiVouchers.filter((v) => v.status === "EXPIRED");
  }, [apiVouchers, filter]);

  const shownDemo = useMemo(() => {
    if (filter === "alle") return demoVouchers;
    if (filter === "actief") return demoVouchers.filter((v) => v.status === "active");
    return demoVouchers.filter((v) => v.status !== "active");
  }, [demoVouchers, filter]);

  const goalTarget = savingsGoal && typeof savingsGoal === "object" && "target_minor" in savingsGoal
    ? Number((savingsGoal as { target_minor: number }).target_minor)
    : null;
  const progress =
    goalTarget && goalTarget > 0 ? Math.min(100, Math.round((availableMinor / goalTarget) * 100)) : null;

  const openSupport = (v?: ConsumerVoucher) => {
    setSupportVoucher(v ?? null);
    setSupportOpen(true);
  };

  const onCopy = async (v: ConsumerVoucher) => {
    if (!v.can_copy_code) return;
    setCopyingId(v.id);
    await revealAndCopyVoucher(v.id);
    setCopyingId(null);
  };

  const submitDispute = async () => {
    if (!disputeVoucher || disputeDescription.trim().length < 10) {
      pushToast({
        title: "Omschrijving te kort",
        message: "Beschrijf het probleem in minstens 10 tekens.",
        kind: "error",
      });
      return;
    }
    setDisputeBusy(true);
    try {
      await createDispute(
        {
          voucher_id: disputeVoucher.id,
          reason: disputeReason,
          description: disputeDescription.trim(),
          screenshot: disputeScreenshot,
        },
        locale
      );
      pushToast({
        title: "Melding ontvangen",
        message: "Je geschil is geopend. Je kunt de status later volgen.",
        kind: "success",
      });
      setDisputeVoucher(null);
      setDisputeDescription("");
      setDisputeScreenshot(null);
    } catch (err) {
      pushToast({
        title: "Melding mislukt",
        message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
        kind: "error",
      });
    } finally {
      setDisputeBusy(false);
    }
  };

  const openTxDetail = async (id: string) => {
    try {
      const detail = await fetchTransaction(id, locale);
      setSelectedTx(detail);
    } catch {
      const row = ledger.find((t) => t.id === id) ?? null;
      setSelectedTx(row);
    }
  };

  if (!sessionReady || (session && !walletReady && apiMode)) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted" role="status">
        Mijn voordelen laden…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted" role="status">
        Doorsturen naar inloggen…
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[120px] h-[30rem] w-[30rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <Eyebrow>Jouw tegoed. Jouw voordeel.</Eyebrow>
            <h1 className="mt-2 text-[clamp(2.6rem,6vw,4.2rem)] font-black leading-none tracking-tight">
              <span className="text-navy">Mijn</span> <span className="text-brand">voordelen</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              {dashboard?.first_name
                ? `Welkom terug, ${dashboard.first_name}. `
                : ""}
              Gebruik je ShopBonus-tegoed voor exclusieve kortingsvouchers bij deelnemende webshops.
              {dashboard && dashboard.pending_minor > 0
                ? " Pending activiteit telt niet mee als besteedbaar tegoed."
                : ""}
            </p>
            {dashboard && (
              <p className="mt-2 text-sm font-semibold text-muted">
                {dashboard.vouchers.issued} actieve voucher(s)
                {dashboard.vouchers.expiring_within_30_days > 0
                  ? ` · ${dashboard.vouchers.expiring_within_30_days} verloopt binnen 30 dagen`
                  : ""}
              </p>
            )}
            <nav
              aria-label="Dashboardnavigatie"
              className="mt-4 flex flex-wrap gap-2 text-sm font-extrabold"
            >
              {(
                [
                  ["vouchers", "Mijn vouchers"],
                  ["transacties", "Mijn punten"],
                  ["aankopen", "Aankopen"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setTab(key);
                    router.replace(`/mijn-voordelen?tab=${key}`, { scroll: false });
                  }}
                  className={`rounded-full px-4 py-2 ${
                    tab === key ? "bg-brand text-white" : "bg-white text-navy shadow-sm hover:bg-brand-light"
                  }`}
                >
                  {label}
                </button>
              ))}
              <Link href="/webshops" className="rounded-full bg-white px-4 py-2 text-navy shadow-sm hover:bg-brand-light">
                Ontdek webshops
              </Link>
              <Link href="/profiel" className="rounded-full bg-white px-4 py-2 text-navy shadow-sm hover:bg-brand-light">
                Profiel
              </Link>
            </nav>
          </div>

          <div className="rounded-[1.75rem] border border-blue-100 bg-white/80 p-6 shadow-[0_18px_50px_-20px_rgba(11,116,255,0.4)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-[72px] w-[72px] place-items-center rounded-3xl bg-gradient-to-br from-[#2b94ff] to-[#0b63ee] text-white shadow-lg">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h9L18 4.5A1.5 1.5 0 0 1 20.4 6l-1.2 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="3" y="9" width="18" height="11" rx="3" fill="white" opacity="0.25" />
                    <rect x="12" y="12.5" width="7" height="5" rx="1.5" fill="white" />
                    <circle cx="15.5" cy="15" r="0.9" fill="#0b63ee" />
                  </svg>
                </span>
                <div>
                  <p className="font-bold text-navy">Mijn ShopBonus-tegoed</p>
                  <p className="text-[44px] font-black leading-none tracking-tight text-navy">
                    {formatMinor(availableMinor)}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-navy">
                    {formatMinor(availableMinor)} beschikbaar
                    {pendingCashbackMinor > 0
                      ? ` · ${formatMinor(pendingCashbackMinor)} cashback in behandeling`
                      : ""}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    Alleen beschikbaar tegoed is inwisselbaar voor vouchers. Cashback hangt af van tracking,
                    eligibility, adverteerder-validatie en settlement.
                  </p>
                </div>
              </div>
              <span className="hidden rotate-[8deg] rounded-2xl bg-gradient-to-br from-[#2b94ff] to-[#0b63ee] p-4 text-3xl font-black text-white shadow-lg sm:block">
                %
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl bg-mist/80 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Beschikbaar</p>
                <p className="mt-1 text-lg font-black text-navy">{formatMinor(availableMinor)}</p>
              </div>
              <div className="rounded-2xl bg-amber-50 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700">In behandeling</p>
                <p className="mt-1 text-lg font-black text-navy">{formatMinor(pendingCashbackMinor)}</p>
              </div>
              <div className="rounded-2xl bg-mist/80 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Gereserveerd</p>
                <p className="mt-1 text-lg font-black text-navy">{formatMinor(reservedMinor)}</p>
              </div>
              <div className="rounded-2xl bg-mist/80 px-3 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted">Totaal verdiend</p>
                <p className="mt-1 text-lg font-black text-navy">{formatMinor(totalEarnedMinor)}</p>
              </div>
            </div>

            {progress !== null && goalTarget !== null && (
              <div className="mt-5 flex items-center gap-3">
                <p className="whitespace-nowrap text-sm font-bold text-navy">
                  {formatMinor(Math.min(availableMinor, goalTarget))}{" "}
                  <span className="font-medium text-muted">van {formatMinor(goalTarget)}</span>
                </p>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-blue-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#2b94ff] to-[#0b63ee] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm font-bold text-navy">{progress}%</p>
              </div>
            )}

            {walletError && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">
                <span>{walletError}</span>
                <button
                  onClick={() => void refreshWallet()}
                  className="font-extrabold text-brand hover:underline"
                >
                  Opnieuw
                </button>
              </div>
            )}
          </div>
        </div>

        {dashboard &&
        ((dashboard.recent_activity?.length ?? 0) > 0 || (dashboard.relevant_offers?.length ?? 0) > 0) ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {(dashboard.recent_activity?.length ?? 0) > 0 && (
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black text-navy">Recente puntenactiviteit</h2>
                <ul className="mt-4 space-y-3">
                  {dashboard.recent_activity.slice(0, 5).map((row) => (
                    <li key={row.id} className="flex items-start justify-between gap-3 text-sm">
                      <span>
                        <span className="font-bold text-navy">{row.reason || row.type}</span>
                        {row.at && (
                          <span className="mt-0.5 block text-xs text-muted">
                            {formatNlDate(row.at)}
                          </span>
                        )}
                      </span>
                      <strong className={row.amount >= 0 ? "text-mint-dark" : "text-navy"}>
                        {row.amount >= 0 ? "+" : ""}
                        {formatMinor(Math.abs(row.amount))}
                      </strong>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(dashboard.relevant_offers?.length ?? 0) > 0 && (
              <section className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-lg font-black text-navy">Relevante aanbiedingen</h2>
                <ul className="mt-4 space-y-3">
                  {dashboard.relevant_offers.slice(0, 5).map((offer) => (
                    <li key={offer.slug || offer.title}>
                      {offer.slug ? (
                        <Link
                          href={`/aanbiedingen/${encodeURIComponent(offer.slug)}`}
                          className="block rounded-2xl bg-mist/70 px-4 py-3 hover:bg-brand-light"
                        >
                          <span className="font-extrabold text-navy">{offer.title}</span>
                          {offer.webshop?.name && (
                            <span className="mt-0.5 block text-xs text-muted">{offer.webshop.name}</span>
                          )}
                        </Link>
                      ) : (
                        <div className="rounded-2xl bg-mist/70 px-4 py-3">
                          <span className="font-extrabold text-navy">{offer.title}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3" role="tablist" aria-label="Mijn voordelen secties">
          <button
            role="tab"
            aria-selected={tab === "vouchers"}
            onClick={() => {
              setTab("vouchers");
              router.replace("/mijn-voordelen?tab=vouchers", { scroll: false });
            }}
            className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 font-extrabold transition ${
              tab === "vouchers" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" stroke="currentColor" strokeWidth="2" />
              <path d="M13 7v2m0 6v2m0-8.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" />
            </svg>
            Mijn vouchers
          </button>
          <button
            role="tab"
            aria-selected={tab === "transacties"}
            onClick={() => {
              setTab("transacties");
              router.replace("/mijn-voordelen?tab=transacties", { scroll: false });
            }}
            className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 font-extrabold transition ${
              tab === "transacties" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Transacties
          </button>
          <button
            role="tab"
            aria-selected={tab === "aankopen"}
            onClick={() => {
              setTab("aankopen");
              router.replace("/mijn-voordelen?tab=aankopen", { scroll: false });
            }}
            className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 font-extrabold transition ${
              tab === "aankopen" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M6 7l1.2 12h9.6L18 7M9 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Affiliate-aankopen
          </button>
        </div>

        <div className="mt-6 pb-16">
          {tab === "vouchers" ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["alle", "Alle"],
                    ["actief", "Actief"],
                    ["used", "Gebruikt"],
                    ["verlopen", "Verlopen"],
                    ["geannuleerd", "Geannuleerd"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setFilter(v)}
                    className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                      filter === v ? "bg-navy text-white" : "bg-white text-muted hover:text-navy"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <div className="space-y-5">
                {apiMode && shownApi.length === 0 && (
                  <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                    <h3 className="text-xl font-black text-navy">Nog geen vouchers hier</h3>
                    <p className="mt-2 text-muted">Ontgrendel je eerste voucher met je tegoed.</p>
                    <Link href="/webshops" className="mt-5 inline-block rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
                      Ontdek webshops
                    </Link>
                  </div>
                )}

                {apiMode &&
                  shownApi.map((v) => {
                    const ui = statusUi(v.status);
                    const minMinor = v.minimum_order_minor ?? v.min_order_minor;
                    const maxMinor = v.maximum_discount_minor ?? v.max_discount_minor;
                    const canCopy = v.can_copy_code;
                    return (
                      <article
                        key={v.id}
                        className={`overflow-hidden rounded-3xl bg-white shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)] ${!ui.active ? "opacity-80" : ""}`}
                      >
                        <div className="flex flex-col gap-5 p-5 sm:flex-row">
                          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-sky-100 to-blue-200 sm:h-auto sm:min-h-[190px] sm:w-52">
                            {v.webshop.logo_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={v.webshop.logo_url}
                                alt=""
                                className={`h-full w-full object-contain p-8 ${!ui.active ? "grayscale-[35%]" : ""}`}
                              />
                            ) : null}
                            <span className="absolute bottom-3 left-3 grid h-14 w-14 place-items-center rounded-full bg-white text-lg font-black text-navy shadow-lg">
                              {logoInitials(v.merchant_name)}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-black text-navy">{v.merchant_name ?? "Webshop"}</h3>
                            <p className="text-sm text-muted">{v.summary ?? v.title}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(v.webshop.categories ?? []).slice(0, 4).map((t) => (
                                <span key={t} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-navy">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs font-semibold text-muted">Ref. {v.voucher_id}</p>
                            {ui.active && (v.expires_soon || (v.days_left != null && v.days_left <= 14)) && (
                              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                                Let op: deze voucher verloopt binnenkort
                                {v.days_left != null ? ` (nog ${v.days_left} dagen)` : ""}.
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <button
                                onClick={() => void openDetail(v.id)}
                                className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                              >
                                Bekijk details
                              </button>
                              <span className="h-4 w-px bg-slate-200" />
                              <button
                                onClick={() => setConditionsId(conditionsId === v.id ? null : v.id)}
                                className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                              >
                                Voorwaarden
                              </button>
                              {(v.website_url || v.webshop.slug) && (
                                <>
                                  <span className="h-4 w-px bg-slate-200" />
                                  {v.website_url ? (
                                    <a
                                      href={v.website_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                                    >
                                      Bezoek webshop
                                    </a>
                                  ) : (
                                    <Link
                                      href={`/webshops/${v.webshop.slug}`}
                                      className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                                    >
                                      Bezoek webshop
                                    </Link>
                                  )}
                                </>
                              )}
                              {v.can_report_problem && (
                                <>
                                  <span className="h-4 w-px bg-slate-200" />
                                  <button
                                    onClick={() => {
                                      setDisputeVoucher(v);
                                      setDisputeReason("code_invalid");
                                      setDisputeDescription("");
                                    }}
                                    className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                                  >
                                    Probleem melden
                                  </button>
                                  <span className="h-4 w-px bg-slate-200" />
                                  <button
                                    onClick={() => openSupport(v)}
                                    className="flex items-center gap-1.5 font-bold text-muted hover:underline"
                                  >
                                    Chat
                                  </button>
                                </>
                              )}
                            </div>
                            {conditionsId === v.id && (
                              <p className="mt-3 rounded-2xl bg-mist px-3 py-2 text-sm text-navy">
                                {v.summary ||
                                  "Voer de code in bij het afrekenen. Minimale bestelling en maximumkorting gelden zoals getoond. Bezoeken of kopiëren markeert de voucher niet als gebruikt."}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:justify-center sm:gap-1">
                            <div className={`rounded-2xl px-5 py-3 text-center ${ui.active ? "bg-brand-light" : "bg-slate-100"}`}>
                              <p className={`text-[32px] font-black leading-none ${ui.active ? "text-brand" : "text-muted"}`}>
                                {discountLabel(v)}
                              </p>
                              <p className={`text-sm font-extrabold ${ui.active ? "text-brand" : "text-muted"}`}>korting</p>
                            </div>
                            <div className="text-sm font-semibold text-navy">
                              {minMinor != null && <p>vanaf {formatMinor(minMinor)}</p>}
                              {maxMinor != null && <p className="text-muted">max. {formatMinor(maxMinor)}</p>}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col justify-center gap-2 border-t border-slate-100 pt-4 sm:w-56 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                            <span
                              className={`inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-extrabold ${
                                ui.active ? "bg-mint text-green-700" : "bg-slate-100 text-muted"
                              }`}
                            >
                              <span className={`h-2.5 w-2.5 rounded-full ${ui.active ? "bg-green-600" : "bg-slate-400"}`} />
                              {ui.label}
                            </span>
                            <p className="flex items-center gap-2 text-sm font-bold text-navy">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                                <path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                              </svg>
                              {ui.active && v.days_left != null
                                ? `Geldig nog ${v.days_left} dagen`
                                : ui.used
                                  ? `Gebruikt ${formatNlDate(v.redeemed_at)}`
                                  : `Verlopen ${formatNlDate(v.expires_at)}`}
                            </p>
                            {ui.active && v.expires_at && (
                              <p className="text-sm text-muted">t/m {formatNlDate(v.expires_at)}</p>
                            )}
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`flex-1 truncate rounded-xl border-2 border-dashed px-3 py-2.5 text-center font-black tracking-wider ${
                                  canCopy ? "border-blue-200 bg-blue-50/50 text-navy" : "border-slate-200 bg-slate-50 text-muted"
                                }`}
                              >
                                {v.code_masked}
                              </span>
                              <button
                                onClick={() => void onCopy(v)}
                                disabled={!canCopy || copyingId === v.id}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-white transition ${
                                  canCopy ? "bg-brand hover:bg-brand-dark" : "cursor-not-allowed bg-slate-200 text-muted"
                                }`}
                              >
                                {justCopied && copyingId === v.id ? "Gekopieerd!" : "Kopieer code"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}

                {!apiMode &&
                  shownDemo.map((v) => {
                    const active = v.status === "active";
                    return (
                      <article key={v.id} className={`overflow-hidden rounded-3xl bg-white shadow-sm ${!active ? "opacity-80" : ""}`}>
                        <div className="p-5">
                          <h3 className="font-black text-navy">{v.shopName}</h3>
                          <p className="text-sm text-muted">{v.code}</p>
                        </div>
                      </article>
                    );
                  })}
              </div>

              <Link
                href="/webshops"
                className="mt-8 flex items-center gap-3 rounded-2xl bg-brand-light/70 p-4 transition hover:bg-brand-light"
              >
                <span className="grid h-14 w-14 shrink-0 rotate-[-8deg] place-items-center rounded-2xl bg-brand text-2xl font-black text-white">
                  %
                </span>
                <div className="flex-1">
                  <p className="font-black text-navy">Meer voordeel?</p>
                  <p className="text-[13px] leading-snug text-muted">
                    Ontdek nieuwe webshops en verdien meer ShopBonus-tegoed.
                  </p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-brand">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
            </>
          ) : tab === "aankopen" ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-black text-navy">Affiliate-aankopen</h3>
                <p className="text-sm text-muted">
                  {affiliateNotice ||
                    "Beloningen hangen af van goedgekeurde, bevestigde aankopen. Pending tegoed is niet besteedbaar."}
                </p>
              </div>
              {affiliateLoading && <p className="px-6 py-8 text-sm text-muted">Laden…</p>}
              {!affiliateLoading && affiliateRows.length === 0 && (
                <p className="px-6 py-8 text-sm text-muted">Nog geen gekoppelde affiliate-aankopen.</p>
              )}
              {affiliateRows.map((row) => {
                const reward = row.reward;
                const pending = row.status === "pending" || reward?.status === "pending";
                return (
                  <div key={row.id} className="border-b border-slate-50 px-6 py-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-navy">{row.webshop || "Webshop"}</p>
                        <p className="text-sm text-muted">
                          {formatNlDate(row.purchased_at)} · {row.status}
                          {reward ? ` · reward ${reward.status}` : ""}
                        </p>
                        {row.explanation && <p className="mt-1 text-sm text-muted">{row.explanation}</p>}
                      </div>
                      <div className="text-right">
                        {reward ? (
                          <p className={`text-lg font-black ${pending ? "text-amber-600" : "text-green-600"}`}>
                            {pending ? "Pending " : "+"}
                            {reward.unit === "points"
                              ? `${reward.amount} pt`
                              : formatMinor(reward.amount)}
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-muted">Geen beloning</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-black text-navy">Alle transacties</h3>
                <p className="text-sm text-muted">
                  {apiMode ? `${ledgerMeta.total} transacties in je walletgeschiedenis.` : `${demoTransactions.length} demo-transacties.`}
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", "Alles"],
                        ["earned", "Verdiend"],
                        ["spent", "Besteed"],
                        ["pending", "Pending"],
                        ["adjustments", "Correcties"],
                      ] as const
                    ).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => {
                          setTxFilter(k);
                          setTxPage(1);
                        }}
                        className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
                          txFilter === k ? "bg-navy text-white" : "bg-mist text-muted"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={txQuery}
                    onChange={(e) => {
                      setTxQuery(e.target.value);
                      setTxPage(1);
                    }}
                    placeholder="Zoeken…"
                    className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm sm:ml-auto sm:max-w-xs"
                    aria-label="Zoek transacties"
                  />
                </div>
              </div>

              {apiMode ? (
                <>
                  {ledgerLoading && <p className="px-6 py-8 text-sm text-muted">Laden…</p>}
                  {!ledgerLoading && ledger.length === 0 && (
                    <p className="px-6 py-8 text-sm text-muted">Geen transacties voor dit filter.</p>
                  )}
                  {ledger.map((t) => {
                    const credit = t.sign === "credit" || t.amount_minor > 0;
                    const amount = Math.abs(t.amount_minor);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => void openTxDetail(t.id)}
                        className="flex w-full items-center gap-4 border-b border-slate-50 px-6 py-4 text-left last:border-0 hover:bg-mist/50"
                      >
                        <span
                          className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-black ${
                            credit ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                          }`}
                        >
                          {credit ? "+" : "−"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-navy">{t.title}</p>
                          <p className="text-sm text-muted">
                            {t.subtitle || t.merchant_name || "—"} • {formatNlDate(t.created_at)}
                          </p>
                        </div>
                        <p className={`text-lg font-black ${credit ? "text-green-600" : "text-navy"}`}>
                          {credit ? "+" : "−"} {formatMinor(amount)}
                        </p>
                      </button>
                    );
                  })}
                  {ledgerMeta.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3 px-6 py-4">
                      <button
                        disabled={txPage <= 1}
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl bg-mist px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >
                        Vorige
                      </button>
                      <span className="text-sm text-muted">
                        Pagina {ledgerMeta.current_page} / {ledgerMeta.last_page}
                      </span>
                      <button
                        disabled={txPage >= ledgerMeta.last_page}
                        onClick={() => setTxPage((p) => p + 1)}
                        className="rounded-xl bg-mist px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >
                        Volgende
                      </button>
                    </div>
                  )}
                </>
              ) : (
                demoTransactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 border-b border-slate-50 px-6 py-4 last:border-0">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-full text-xl font-black ${
                        t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"
                      }`}
                    >
                      {t.type === "credit" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-navy">{t.title}</p>
                      <p className="text-sm text-muted">
                        {t.subtitle} • {t.date}
                      </p>
                    </div>
                    <p className={`text-lg font-black ${t.type === "credit" ? "text-green-600" : "text-navy"}`}>
                      {t.type === "credit" ? "+" : "−"} {formatMinor(Math.round(t.amount * 100))}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      {selectedTx && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label="Sluiten" onClick={() => setSelectedTx(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy">{selectedTx.title}</h3>
            <p className="mt-1 text-sm text-muted">{selectedTx.subtitle || selectedTx.merchant_name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Bedrag</dt>
                <dd className="font-extrabold text-navy">{formatMinor(Math.abs(selectedTx.amount_minor))}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Type</dt>
                <dd className="font-semibold text-navy">{selectedTx.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Status</dt>
                <dd className="font-semibold text-navy">{selectedTx.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Datum</dt>
                <dd className="font-semibold text-navy">{formatNlDate(selectedTx.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Referentie</dt>
                <dd className="truncate font-mono text-xs text-navy">{selectedTx.id}</dd>
              </div>
            </dl>
            <button
              onClick={() => setSelectedTx(null)}
              className="mt-6 w-full rounded-2xl bg-brand py-3 font-extrabold text-white"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label="Sluiten" onClick={() => setDetail(null)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            {detailLoading && !detail ? (
              <p className="text-muted">Details laden…</p>
            ) : detail ? (
              <>
                <h3 className="text-lg font-black text-navy">{detail.merchant_name ?? "Voucher"}</h3>
                <p className="mt-1 text-sm text-muted">{detail.title ?? discountLabel(detail)}</p>
                {detail.expires_soon && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                    Verloopt binnenkort — er wordt geen vervangende code automatisch uitgegeven.
                  </p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Referentie</dt>
                    <dd className="truncate font-mono text-xs text-navy">{detail.voucher_id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Status</dt>
                    <dd className="font-semibold text-navy">{statusUi(detail.status).label}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Uitgegeven</dt>
                    <dd className="font-semibold text-navy">{formatNlDate(detail.issued_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Geldig tot</dt>
                    <dd className="font-semibold text-navy">{formatNlDate(detail.expires_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Min. bestelling</dt>
                    <dd className="font-semibold text-navy">
                      {formatMinor(detail.minimum_order_minor ?? detail.min_order_minor ?? 0)}
                    </dd>
                  </div>
                  {detail.purchase && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">Checkout</dt>
                      <dd className="truncate font-mono text-xs text-navy">{detail.purchase.checkout_id}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 rounded-2xl bg-mist p-4">
                  <p className="text-xs font-bold uppercase text-muted">Code</p>
                  <p className="mt-1 break-all font-black tracking-wider text-navy">
                    {detail.code ?? detail.code_masked}
                  </p>
                  {detail.instructions && (
                    <p className="mt-2 text-sm text-muted">{detail.instructions}</p>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detail.can_copy_code && (
                    <button
                      type="button"
                      onClick={() => void onCopy(detail)}
                      className="rounded-2xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white"
                    >
                      {justCopied && copyingId === detail.id ? "Gekopieerd!" : "Kopieer code"}
                    </button>
                  )}
                  {detail.website_url && (
                    <a
                      href={detail.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy"
                    >
                      Bezoek webshop
                    </a>
                  )}
                  {detail.can_report_problem && (
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeVoucher(detail);
                        setDetail(null);
                      }}
                      className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy"
                    >
                      Probleem melden
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="mt-4 w-full rounded-2xl bg-mist py-3 font-extrabold text-navy"
                >
                  Sluiten
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {disputeVoucher && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label="Sluiten" onClick={() => setDisputeVoucher(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy">Probleem melden</h3>
            <p className="mt-1 text-sm text-muted">
              {disputeVoucher.merchant_name} · {disputeVoucher.code_masked}
            </p>
            <label className="mt-4 block text-sm font-bold text-navy">
              Reden
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                className="form-input mt-1 w-full"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">
              Omschrijving
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
                className="form-input mt-1 w-full"
                placeholder="Wat ging er mis? Kort en duidelijk."
              />
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">
              Screenshot (optioneel)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="form-input mt-1 w-full text-sm font-normal file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-1.5 file:font-bold file:text-navy"
                onChange={(e) => setDisputeScreenshot(e.target.files?.[0] ?? null)}
              />
            </label>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={disputeBusy}
                onClick={() => void submitDispute()}
                className="flex-1 rounded-2xl bg-brand py-3 font-extrabold text-white disabled:opacity-50"
              >
                {disputeBusy ? "Versturen…" : "Verstuur melding"}
              </button>
              <button
                type="button"
                onClick={() => setDisputeVoucher(null)}
                className="rounded-2xl bg-mist px-4 py-3 font-extrabold text-navy"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <SupportChatPanel
        open={supportOpen}
        onClose={() => setSupportOpen(false)}
        voucherId={supportVoucher?.id}
        merchantName={supportVoucher?.merchant_name}
      />
    </div>
  );
}
