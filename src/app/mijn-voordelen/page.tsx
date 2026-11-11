"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/benefits";
import { fetchConsumerDashboard, type ConsumerDashboard } from "@/lib/dashboard";
import { formatMinor, formatNlDate } from "@/lib/money";
import type { Dictionary } from "@/i18n/dictionaries";
import { useLocale } from "@/i18n/LocaleContext";
import { consumerActivityStatus } from "@/i18n/consumerActivityCopy";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

type VoucherFilter = "alle" | "actief" | "used" | "verlopen" | "geannuleerd";
type TxFilter = "all" | "earned" | "spent" | "adjustments";
type BenefitsTab = "vouchers" | "transacties" | "aankopen";

function signedMinorLabel(amountMinor: number, sign?: "credit" | "debit", intlLocale = "nl-NL"): string {
  const credit = sign ? sign === "credit" : amountMinor >= 0;
  const abs = Math.abs(amountMinor);
  return `${credit ? "+" : "−"} ${formatMinor(abs, "EUR", intlLocale)}`;
}

const disputeReasons = (c: Dictionary): { value: DisputeReason; label: string }[] => [
  { value: "code_invalid", label: c.benefitsInvalidCode },
  { value: "code_already_used", label: c.benefitsUsedCode },
  { value: "refused_by_webshop", label: c.benefitsRefusedCode },
  { value: "terms_differ", label: c.benefitsDifferentTerms },
  { value: "missing_after_payment", label: c.benefitsMissingVoucher },
  { value: "other", label: c.benefitsOther },
];

function statusUi(status: string, c: Dictionary): { label: string; active: boolean; used: boolean } {
  const s = status.toUpperCase();
  if (s === "ACTIVE") return { label: c.benefitsActive, active: true, used: false };
  if (s === "USED") return { label: c.benefitsUsed, active: false, used: true };
  if (s === "CANCELLED") return { label: c.benefitsCancelled, active: false, used: false };
  return { label: c.benefitsExpired, active: false, used: false };
}

function discountLabel(v: ConsumerVoucher, intlLocale: string): string {
  if (v.discount_type === "percentage" || v.discount_type === "percent") {
    const n = v.discount_value ?? 0;
    return `${Number.isInteger(n) ? n : n.toLocaleString(intlLocale, { maximumFractionDigits: 1 })}%`;
  }
  if (typeof v.discount_value === "number") {
    // Fixed offers store cents in terms snapshots.
    if (v.discount_type === "fixed" || v.discount_type === "amount" || v.discount_value >= 100) {
      return formatMinor(v.discount_value, "EUR", intlLocale);
    }
    return formatMinor(Math.round(v.discount_value * 100), "EUR", intlLocale);
  }
  return "—";
}

function logoInitials(name: string | null | undefined): string {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "S";
}

export default function MijnVoordelenPage() {
  const { dictionary: c } = useLocale();
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center text-muted" role="status">{c.benefitsLoading}</div>
      }
    >
      <MijnVoordelenInner />
    </Suspense>
  );
}

function MijnVoordelenInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, dictionary: c, intlLocale } = useLocale();
  const formatMoney = (minor: number) => formatMinor(minor, "EUR", intlLocale);
  const formatDate = (iso: string | null | undefined) => formatNlDate(iso, intlLocale);
  const signedMoney = (minor: number, sign?: "credit" | "debit") => signedMinorLabel(minor, sign, intlLocale);
  const signedReward = (amount: number, unit: string | undefined, sign?: "credit" | "debit") => {
    if (unit === "points") return `${(sign ? sign === "credit" : amount >= 0) ? "+" : "−"} ${Math.abs(amount).toLocaleString(intlLocale)} ${c.benefitsPointsUnit}`;
    return unit === "eur_credit" ? signedMoney(amount, sign) : "—";
  };
  const { session, ready: sessionReady } = useSession();
  const {
    availableMinor,
    totalEarnedMinor,
    totalSpentMinor,
    walletReady,
    walletError,
    financialRevision,
    apiMode,
    apiVouchers,
    voucherStatus,
    vouchers: demoVouchers,
    transactions: demoTransactions,
    refreshWallet,
    refreshVouchers,
    revealAndCopyVoucher,
    justCopied,
    pushToast,
  } = useShopBonus();

  const focusedVoucher = searchParams.get("voucher");
  const tabParam = searchParams.get("tab");
  const tab: BenefitsTab = pathname === "/transacties" ? "transacties" : pathname === "/aankopen" ? "aankopen" : "vouchers";
  const [filter, setFilter] = useState<VoucherFilter>("alle");
  const [txFilter, setTxFilter] = useState<TxFilter>("all");
  const [txQuery, setTxQuery] = useState("");
  const [txPage, setTxPage] = useState(1);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerMeta, setLedgerMeta] = useState({ current_page: 1, last_page: 1, per_page: 25, total: 0 });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [ledgerMayBeStale, setLedgerMayBeStale] = useState(false);
  const ledgerReqId = useRef(0);
  const [selectedTx, setSelectedTx] = useState<LedgerEntry | null>(null);
  const [affiliateRows, setAffiliateRows] = useState<AffiliateActivityItem[]>([]);
  const [affiliateNotice, setAffiliateNotice] = useState<string | null>(null);
  const [affiliateLoading, setAffiliateLoading] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportVoucher, setSupportVoucher] = useState<ConsumerVoucher | null>(null);
  const [conditionsId, setConditionsId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const dashboardScope = `${session?.user.id ?? ""}:${locale}`;
  const dashboardKey = `${dashboardScope}:${financialRevision}`;
  const [dashboardResult, setDashboardResult] = useState<{
    scope: string;
    key: string;
    data: ConsumerDashboard | null;
    status: "success" | "error";
  } | null>(null);
  const dashboard = apiMode && dashboardResult?.scope === dashboardScope ? dashboardResult.data : null;
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
      router.replace(`/inloggen?next=${encodeURIComponent(pathname + (searchParams.size ? "?" + searchParams.toString() : ""))}`);
    }
  }, [sessionReady, session, router, searchParams, pathname]);

  useEffect(() => {
    if (pathname !== "/mijn-voordelen" || !tabParam) return;
    const target = focusedVoucher ? "vouchers" : tabParam === "transacties" || tabParam === "aankopen" ? tabParam : "vouchers";
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    router.replace(`/${target}${params.size ? `?${params}` : ""}`, { scroll: false });
  }, [pathname, tabParam, focusedVoucher, searchParams, router]);

  useEffect(() => {
    if (!session?.user || !apiMode) return;
    let cancelled = false;
    void fetchConsumerDashboard(locale)
      .then((data) => {
        if (!cancelled) setDashboardResult({ scope: dashboardScope, key: dashboardKey, data, status: "success" });
      })
      .catch(() => {
        if (!cancelled) setDashboardResult((previous) => ({
          scope: dashboardScope,
          key: dashboardKey,
          data: previous?.scope === dashboardScope ? previous.data : null,
          status: "error",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user, apiMode, locale, dashboardScope, dashboardKey]);

  const loadLedger = useCallback(async () => {
    if (!apiMode) return;
    const reqId = ++ledgerReqId.current;
    setLedgerLoading(true);
    setLedgerError(null);
    try {
      const res = await fetchTransactions(
        {
          filter: txFilter === "all" ? "posted" : txFilter,
          unit: "eur_credit",
          q: txQuery.trim() || undefined,
          page: txPage,
          per_page: 25,
        },
        locale
      );
      if (reqId !== ledgerReqId.current) return;
      setLedger(res.data);
      setLedgerMeta(res.meta);
      setLedgerLoaded(true);
      setLedgerMayBeStale(false);
    } catch (err) {
      if (reqId !== ledgerReqId.current) return;
      const message = err instanceof ApiError ? err.message : c.benefitsRetryHint;
      setLedgerError(message);
      setLedgerMayBeStale(true);
      pushToast({
        title: c.benefitsLedgerError,
        message,
        kind: "error",
      });
    } finally {
      if (reqId === ledgerReqId.current) setLedgerLoading(false);
    }
  }, [apiMode, txFilter, txQuery, txPage, locale, pushToast, c]);

  useEffect(() => {
    if (tab !== "transacties" || !apiMode) return;
    const timer = window.setTimeout(() => void loadLedger(), 0);
    return () => {
      window.clearTimeout(timer);
      ledgerReqId.current += 1;
    };
  }, [tab, apiMode, loadLedger, financialRevision]);

  useEffect(() => {
    if (tab !== "aankopen" || !apiMode) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
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
            title: c.benefitsAffiliateError,
            message: err instanceof ApiError ? err.message : c.benefitsRetryHint,
            kind: "error",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setAffiliateLoading(false);
      });
    }, 0);
    return () => {
      window.clearTimeout(timer);
      cancelled = true;
    };
  }, [tab, apiMode, locale, pushToast, c, financialRevision]);

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
          title: c.benefitsDetailError,
          message: err instanceof ApiError ? err.message : c.benefitsRetryHint,
          kind: "error",
        });
      } finally {
        setDetailLoading(false);
      }
    },
    [apiMode, locale, pushToast, c]
  );

  useEffect(() => {
    if (!focusedVoucher || !apiMode || !session?.user) return;
    const timer = window.setTimeout(() => void openDetail(focusedVoucher), 0);
    return () => window.clearTimeout(timer);
  }, [focusedVoucher, apiMode, session?.user, openDetail]);

  const focusedTransaction = searchParams.get("transaction");
  useEffect(() => {
    if (!focusedTransaction || tab !== "transacties" || !apiMode || !session?.user) return;
    let cancelled = false;
    void fetchTransaction(focusedTransaction, locale).then((entry) => {
      if (!cancelled) setSelectedTx(entry);
    }).catch((error) => {
      if (!cancelled) pushToast({ title: c.benefitsDetailError, message: error instanceof ApiError ? error.message : c.benefitsRetryHint, kind: "error" });
    });
    return () => { cancelled = true; };
  }, [focusedTransaction, tab, apiMode, session?.user, locale, pushToast, c]);

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

  const activeVoucherCount = apiMode
    ? (voucherStatus === "ready" ? apiVouchers.filter((v) => v.status === "ACTIVE").length : dashboard?.vouchers.issued)
    : demoVouchers.filter((v) => v.status === "active").length;
  const showDiscover = activeVoucherCount === 0;

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
        title: c.benefitsShortDescription,
        message: c.benefitsDescriptionHint,
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
        title: c.benefitsReportSuccess,
        message: c.benefitsReportSuccessHint,
        kind: "success",
      });
      setDisputeVoucher(null);
      setDisputeDescription("");
      setDisputeScreenshot(null);
    } catch (err) {
      pushToast({
        title: c.benefitsReportError,
        message: err instanceof ApiError ? err.message : c.benefitsRetryHint,
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

  if (!sessionReady) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted" role="status">{c.benefitsLoading}</div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50vh] place-items-center text-muted" role="status">{c.benefitsRedirecting}</div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[120px] h-[30rem] w-[30rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid items-center gap-5 lg:grid-cols-2">
          <div>
            <h1 className="text-[clamp(2.4rem,6vw,4rem)] font-black leading-none tracking-tight">
              <span className="text-navy">{c.benefitsTitlePrefix}</span> <span className="text-brand">{c.benefitsTitleAccent}</span>
            </h1>
            <p className="mt-3 max-w-md text-muted">{c.benefitsIntroduction}</p>
            {activeVoucherCount !== undefined && (
              <p className="mt-2 text-sm font-semibold text-muted">
                {activeVoucherCount.toLocaleString(intlLocale)}{" "}
                {activeVoucherCount === 1 ? c.benefitsActiveVoucher : c.benefitsActiveVouchers}
              </p>
            )}
            {showDiscover && (
              <Link href="/webshops" className="mt-4 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand/90">
                {c.benefitsDiscover}
              </Link>
            )}
          </div>

          <section aria-labelledby="benefits-wallet-title" aria-busy={apiMode && !walletReady && !walletError} className="rounded-[1.75rem] border border-blue-100 bg-white/80 p-5 shadow-[0_18px_50px_-20px_rgba(11,116,255,0.4)] backdrop-blur sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center sm:size-14 rounded-3xl bg-gradient-to-br from-[#2b94ff] to-[#0b63ee] text-white shadow-lg">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h9L18 4.5A1.5 1.5 0 0 1 20.4 6l-1.2 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="3" y="9" width="18" height="11" rx="3" fill="white" opacity="0.25" />
                    <rect x="12" y="12.5" width="7" height="5" rx="1.5" fill="white" />
                    <circle cx="15.5" cy="15" r="0.9" fill="#0b63ee" />
                  </svg>
                </span>
                <div>
                  <h2 id="benefits-wallet-title" className="font-bold text-navy">{c.benefitsCredit}</h2>
                  {(!apiMode || walletReady) && (
                    <p className="mt-1">
                      <span className="block text-4xl font-black leading-none tracking-tight text-navy">{formatMoney(availableMinor)}</span>
                      <span className="mt-1 block text-sm text-muted">{c.benefitsAvailableSuffix}</span>
                    </p>
                  )}
                  {apiMode && !walletReady && !walletError && (
                    <p role="status" className="mt-2 text-sm text-muted">{c.benefitsLoadingShort}</p>
                  )}
                </div>
              </div>
            </div>

            {walletError && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-600">
                <span>{walletError}</span>
                <button
                  onClick={() => void refreshWallet()}
                  className="font-extrabold text-brand hover:underline"
                >{c.benefitsRetryShort}</button>
              </div>
            )}
          </section>
        </div>

        <nav className="mt-5 flex flex-wrap gap-2 sm:gap-3" aria-label={c.benefitsSections}>
          <Link
            href="/vouchers"
            scroll={false}
            aria-current={tab === "vouchers" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base font-extrabold transition ${
              tab === "vouchers" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" stroke="currentColor" strokeWidth="2" />
              <path d="M13 7v2m0 6v2m0-8.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" />
            </svg>{c.benefitsVouchers}</Link>
          <Link
            href="/transacties"
            scroll={false}
            aria-current={tab === "transacties" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base font-extrabold transition ${
              tab === "transacties" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>{c.benefitsTransactions}</Link>
          <Link
            href="/aankopen"
            scroll={false}
            aria-current={tab === "aankopen" ? "page" : undefined}
            className={`flex items-center gap-2 rounded-full px-3 py-2.5 text-sm sm:px-6 sm:py-3 sm:text-base font-extrabold transition ${
              tab === "aankopen" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 7h16M6 7l1.2 12h9.6L18 7M9 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>{c.benefitsAffiliatePurchases}</Link>
        </nav>

        <div className={"mt-6 grid gap-6 pb-16 " + (tab === "vouchers" && dashboard?.relevant_offers?.length ? "lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start" : "")}>
          <div className="min-w-0">
          {tab === "vouchers" ? (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {(
                  [
                    ["alle", c.benefitsAll],
                    ["actief", c.benefitsActive],
                    ["used", c.benefitsUsed],
                    ["verlopen", c.benefitsExpired],
                    ["geannuleerd", c.benefitsCancelled],
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
                {apiMode && voucherStatus === "ready" && shownApi.length === 0 && (
                  <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                    <h3 className="text-xl font-black text-navy">{c.benefitsEmptyVouchers}</h3>
                    <p className="mt-2 text-muted">{c.benefitsFirstVoucher}</p>
                  </div>
                )}

                {apiMode &&
                  shownApi.map((v) => {
                    const ui = statusUi(v.status, c);
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
                            <h3 className="text-xl font-black text-navy">{v.merchant_name ?? c.benefitsShop}</h3>
                            <p className="text-sm text-muted">{v.summary ?? v.title}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {(v.webshop.categories ?? []).slice(0, 4).map((t) => (
                                <span key={t} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-navy">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <p className="mt-2 text-xs font-semibold text-muted">{c.benefitsReferenceShort}{" "}{v.voucher_id}</p>
                            {ui.active && (v.expires_soon || (v.days_left != null && v.days_left <= 14)) && (
                              <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">{c.benefitsExpiring}{v.days_left != null ? c.benefitsDaysRemaining.replace("{count}", String(v.days_left)) : ""}.
                              </p>
                            )}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <button
                                onClick={() => void openDetail(v.id)}
                                className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                              >{c.benefitsDetails}</button>
                              <span className="h-4 w-px bg-slate-200" />
                              <button
                                onClick={() => setConditionsId(conditionsId === v.id ? null : v.id)}
                                className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                              >{c.benefitsTerms}</button>
                              {(v.website_url || v.webshop.slug) && (
                                <>
                                  <span className="h-4 w-px bg-slate-200" />
                                  {v.website_url ? (
                                    <a
                                      href={v.website_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                                    >{c.benefitsVisit}</a>
                                  ) : (
                                    <Link
                                      href={`/webshops/${v.webshop.slug}`}
                                      className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                                    >{c.benefitsVisit}</Link>
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
                                  >{c.benefitsReport}</button>
                                  <span className="h-4 w-px bg-slate-200" />
                                  <button
                                    onClick={() => openSupport(v)}
                                    className="flex items-center gap-1.5 font-bold text-muted hover:underline"
                                  >{c.benefitsChat}</button>
                                </>
                              )}
                            </div>
                            {conditionsId === v.id && (
                              <p className="mt-3 rounded-2xl bg-mist px-3 py-2 text-sm text-navy">
                                {v.summary ||
                                  c.benefitsTermsFallback}
                              </p>
                            )}
                          </div>

                          <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:justify-center sm:gap-1">
                            <div className={`rounded-2xl px-5 py-3 text-center ${ui.active ? "bg-brand-light" : "bg-slate-100"}`}>
                              <p className={`text-[32px] font-black leading-none ${ui.active ? "text-brand" : "text-muted"}`}>
                                {discountLabel(v, intlLocale)}
                              </p>
                              <p className={`text-sm font-extrabold ${ui.active ? "text-brand" : "text-muted"}`}>{c.benefitsDiscount}</p>
                            </div>
                            <div className="text-sm font-semibold text-navy">
                              {minMinor != null && <p>{c.benefitsFrom}{" "}{formatMoney(minMinor)}</p>}
                              {maxMinor != null && <p className="text-muted">{c.benefitsMaximum}{" "}{formatMoney(maxMinor)}</p>}
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
                                ? c.benefitsValidDays.replace("{count}", String(v.days_left))
                                : ui.used
                                  ? c.benefitsUsedDate.replace("{date}", formatDate(v.redeemed_at))
                                  : c.benefitsExpiredDate.replace("{date}", formatDate(v.expires_at))}
                            </p>
                            {ui.active && v.expires_at && (
                              <p className="text-sm text-muted">{c.benefitsUntil}{" "}{formatDate(v.expires_at)}</p>
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
                                {justCopied && copyingId === v.id ? c.benefitsCopied : c.benefitsCopy}
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

              {!showDiscover && (
              <Link
                href="/webshops"
                className="mt-8 flex items-center gap-3 rounded-2xl bg-brand-light/70 p-4 transition hover:bg-brand-light"
              >
                <span className="grid h-14 w-14 shrink-0 rotate-[-8deg] place-items-center rounded-2xl bg-brand text-2xl font-black text-white">
                  %
                </span>
                <div className="flex-1">
                  <p className="font-black text-navy">{c.benefitsMore}</p>
                  <p className="text-[13px] leading-snug text-muted">{c.benefitsMoreHint}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-brand">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </Link>
              )}
            </>
          ) : tab === "aankopen" ? (
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-5">
                <h3 className="text-lg font-black text-navy">{c.benefitsAffiliatePurchases}</h3>
                <p className="text-sm text-muted">
                  {affiliateNotice ||
                    c.benefitsAffiliateExplanation}
                </p>
              </div>
              {affiliateLoading && <p className="px-6 py-8 text-sm text-muted">{c.benefitsLoadingShort}</p>}
              {!affiliateLoading && affiliateRows.length === 0 && (
                <p className="px-6 py-8 text-sm text-muted">{c.benefitsEmptyPurchases}</p>
              )}
              {affiliateRows.map((row) => {
                const reward = row.reward;
                const credited = reward?.status === "credited";
                return (
                  <div key={row.id} className="border-b border-slate-50 px-6 py-4 last:border-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-extrabold text-navy">{row.webshop || c.benefitsShop}</p>
                        <p className="text-sm text-muted">
                          {formatDate(row.purchased_at)} · {consumerActivityStatus(row.status, locale)}
                          {reward ? c.benefitsRewardStatus.replace("{status}", consumerActivityStatus(reward.status, locale)) : ""}
                        </p>
                        {row.explanation && <p className="mt-1 text-sm text-muted">{row.explanation}</p>}
                      </div>
                      <div className="text-right">
                        {reward ? (
                          <p className={`text-lg font-black ${credited ? "text-green-600" : "text-navy"}`}>
                            {credited ? "+" : ""}
                            {reward.unit === "points"
                              ? `${reward.amount} pt`
                              : formatMoney(reward.amount)}
                          </p>
                        ) : (
                          <p className="text-sm font-bold text-muted">{c.benefitsNoReward}</p>
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
                <h3 className="text-lg font-black text-navy">{c.benefitsAllTransactions}</h3>
                <p className="text-sm text-muted">
                  {apiMode
                    ? ledgerLoaded && !ledgerLoading
                      ? c.benefitsTransactionCount.replace("{count}", String(ledgerMeta.total))
                      : c.benefitsLoadingShort
                    : c.benefitsDemoCount.replace("{count}", String(demoTransactions.length))}
                </p>
                {walletReady && (
                  <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
                    <span>{c.benefitsEarnedTotal}{" "}<strong className="text-navy">{formatMoney(totalEarnedMinor)}</strong></span>
                    <span>{c.benefitsSpentTotal}{" "}<strong className="text-navy">{formatMoney(totalSpentMinor)}</strong></span>
                  </p>
                )}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["all", c.benefitsAllFilters],
                        ["earned", c.benefitsEarned],
                        ["spent", c.benefitsSpent],
                        ["adjustments", c.benefitsAdjustments],
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
                    placeholder={c.benefitsSearch}
                    className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm sm:ml-auto sm:max-w-xs"
                    aria-label={c.benefitsSearchTransactions}
                  />
                </div>
              </div>

              {apiMode ? (
                <>
                  {ledgerError && (
                    <div className="mx-6 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-700">
                      <span>
                        {ledgerMayBeStale
                          ? c.benefitsStaleLedger
                          : ledgerError}
                      </span>
                      <button
                        type="button"
                        onClick={() => void loadLedger()}
                        className="font-extrabold text-brand hover:underline"
                      >{c.benefitsRetry}</button>
                    </div>
                  )}
                  {ledgerLoading && <p className="px-6 py-8 text-sm text-muted">{c.benefitsLoadingShort}</p>}
                  {ledgerLoaded && !ledgerLoading && !ledgerError && ledger.length === 0 && (
                    <p className="px-6 py-8 text-sm text-muted">{c.benefitsEmptyTransactions}</p>
                  )}
                  {ledger.map((t) => {
                    const credit = t.sign === "credit" || t.amount_minor > 0;
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
                            {t.subtitle || t.merchant_name || "—"} • {formatDate(t.created_at)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                        <p className={`text-lg font-black ${credit ? "text-green-600" : "text-navy"}`}>
                          {signedReward(t.amount, t.unit, t.sign)}
                        </p>
                          {typeof t.available_after === "number" && (
                            <p className="text-xs text-muted">{c.benefitsBalanceAfter} {formatMoney(t.available_after)}</p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {ledgerMeta.last_page > 1 && (
                    <div className="flex items-center justify-between gap-3 px-6 py-4">
                      <button
                        disabled={txPage <= 1}
                        onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                        className="rounded-xl bg-mist px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >{c.benefitsPrevious}</button>
                      <span className="text-sm text-muted">{c.benefitsPage}{" "}{ledgerMeta.current_page} / {ledgerMeta.last_page}
                      </span>
                      <button
                        disabled={txPage >= ledgerMeta.last_page}
                        onClick={() => setTxPage((p) => p + 1)}
                        className="rounded-xl bg-mist px-4 py-2 text-sm font-bold disabled:opacity-40"
                      >{c.benefitsNext}</button>
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
                      {t.type === "credit" ? "+" : "−"} {formatMoney(Math.round(t.amount * 100))}
                    </p>
                  </div>
                ))
              )}
            </div>
          )}
          </div>

          {tab === "vouchers" && dashboard && dashboard.relevant_offers?.length > 0 && (
            <aside className="lg:sticky lg:top-24">
              <section className="rounded-3xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-navy">{c.benefitsOffers}</h2>
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
            </aside>
          )}
        </div>
      </section>

      {selectedTx && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label={c.benefitsClose} onClick={() => setSelectedTx(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy">{selectedTx.title}</h3>
            <p className="mt-1 text-sm text-muted">{selectedTx.subtitle || selectedTx.merchant_name}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.benefitsAmount}</dt>
                <dd className="font-extrabold text-navy">
                  {signedReward(selectedTx.amount, selectedTx.unit, selectedTx.sign)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.benefitsType}</dt>
                <dd className="font-semibold text-navy">{selectedTx.type}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.benefitsStatus}</dt>
                <dd className="font-semibold text-navy">{consumerActivityStatus(selectedTx.status, locale)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.benefitsDate}</dt>
                <dd className="font-semibold text-navy">{formatDate(selectedTx.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">{c.benefitsReference}</dt>
                <dd className="truncate font-mono text-xs text-navy">{selectedTx.id}</dd>
              </div>
            </dl>
            <button
              onClick={() => setSelectedTx(null)}
              className="mt-6 w-full rounded-2xl bg-brand py-3 font-extrabold text-white"
            >{c.benefitsClose}</button>
          </div>
        </div>
      )}

      {(detail || detailLoading) && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label={c.benefitsClose} onClick={() => setDetail(null)} />
          <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            {detailLoading && !detail ? (
              <p className="text-muted">{c.benefitsDetailLoading}</p>
            ) : detail ? (
              <>
                <h3 className="text-lg font-black text-navy">{detail.merchant_name ?? c.benefitsVoucher}</h3>
                <p className="mt-1 text-sm text-muted">{detail.title ?? discountLabel(detail, intlLocale)}</p>
                {detail.expires_soon && (
                  <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">{c.benefitsExpiryWarning}</p>
                )}
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{c.benefitsReference}</dt>
                    <dd className="truncate font-mono text-xs text-navy">{detail.voucher_id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{c.benefitsStatus}</dt>
                    <dd className="font-semibold text-navy">{statusUi(detail.status, c).label}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{c.benefitsIssued}</dt>
                    <dd className="font-semibold text-navy">{formatDate(detail.issued_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{c.benefitsValidUntil}</dt>
                    <dd className="font-semibold text-navy">{formatDate(detail.expires_at)}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">{c.benefitsMinimumOrder}</dt>
                    <dd className="font-semibold text-navy">
                      {formatMoney(detail.minimum_order_minor ?? detail.min_order_minor ?? 0)}
                    </dd>
                  </div>
                  {detail.purchase && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted">{c.benefitsCheckout}</dt>
                      <dd className="truncate font-mono text-xs text-navy">{detail.purchase.checkout_id}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 rounded-2xl bg-mist p-4">
                  <p className="text-xs font-bold uppercase text-muted">{c.benefitsCode}</p>
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
                      {justCopied && copyingId === detail.id ? c.benefitsCopied : c.benefitsCopy}
                    </button>
                  )}
                  {detail.website_url && (
                    <a
                      href={detail.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy"
                    >{c.benefitsVisit}</a>
                  )}
                  {detail.can_report_problem && (
                    <button
                      type="button"
                      onClick={() => {
                        setDisputeVoucher(detail);
                        setDetail(null);
                      }}
                      className="rounded-2xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy"
                    >{c.benefitsReport}</button>
                  )}
                </div>
                <button
                  onClick={() => setDetail(null)}
                  className="mt-4 w-full rounded-2xl bg-mist py-3 font-extrabold text-navy"
                >{c.benefitsClose}</button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {disputeVoucher && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-navy/40 p-4 sm:items-center">
          <button className="absolute inset-0" aria-label={c.benefitsClose} onClick={() => setDisputeVoucher(null)} />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-black text-navy">{c.benefitsReport}</h3>
            <p className="mt-1 text-sm text-muted">
              {disputeVoucher.merchant_name} · {disputeVoucher.code_masked}
            </p>
            <label className="mt-4 block text-sm font-bold text-navy">{c.benefitsReason}<select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                className="form-input mt-1 w-full"
              >
                {disputeReasons(c).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">{c.benefitsDescription}<textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                rows={4}
                className="form-input mt-1 w-full"
                placeholder={c.benefitsProblemPlaceholder}
              />
            </label>
            <label className="mt-3 block text-sm font-bold text-navy">{c.benefitsScreenshot}<input
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
                {disputeBusy ? c.benefitsSending : c.benefitsSendReport}
              </button>
              <button
                type="button"
                onClick={() => setDisputeVoucher(null)}
                className="rounded-2xl bg-mist px-4 py-3 font-extrabold text-navy"
              >{c.benefitsCancel}</button>
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
