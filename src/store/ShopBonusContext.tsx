"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  MyVoucher,
  Transaction,
  myVouchers as seedVouchers,
  transactions as seedTransactions,
  user as seedUser,
} from "@/data/dummy";
import { ApiError } from "@/lib/api";
import {
  fetchMeWallet,
  fetchVoucherDetail,
  fetchVouchers,
  newIdempotencyKey,
  quoteCheckout,
  startCheckout,
  type ConsumerVoucher,
  type WalletSummary,
} from "@/lib/benefits";
import { subscribeWalletInvalidation } from "@/lib/echo";
import { minorToMajor } from "@/lib/money";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";

export interface Toast {
  id: number;
  title: string;
  message: string;
  kind: "success" | "error" | "info";
}

interface Profile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  notifications: { vouchers: boolean; reminders: boolean; inspiration: boolean };
}

interface ShopBonusState {
  /** Available credit in major euros — mirrors available_minor / 100 for legacy UI. */
  balance: number;
  availableMinor: number;
  /** Checkout holds only — never pending affiliate cashback. */
  reservedMinor: number;
  totalEarnedMinor: number;
  totalSpentMinor: number;
  savingsGoal: WalletSummary["savings_goal"];
  walletReady: boolean;
  walletError: string | null;
  /**
   * Bumps after wallet invalidation, reconnect recovery, or focus refresh so
   * pages can re-fetch ledger / activity / dashboard projections.
   */
  financialRevision: number;
  apiMode: boolean;
  vouchers: MyVoucher[];
  apiVouchers: ConsumerVoucher[];
  voucherStatus: "idle" | "loading" | "ready" | "error";
  transactions: Transaction[];
  profile: Profile;
  toasts: Toast[];
  unlocked: Record<string, string>;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  unlockOffer: (
    shopSlug: string,
    offerId: string
  ) => Promise<{ ok: boolean; code?: string; reason?: string; voucherId?: string }>;
  updateProfile: (p: Partial<Profile>) => void;
  copyCode: (code: string) => void;
  revealAndCopyVoucher: (voucherId: string) => Promise<boolean>;
  refreshWallet: () => Promise<WalletSummary | null>;
  refreshVouchers: (filter?: "all" | "active" | "used" | "expired" | "cancelled") => Promise<void>;
  justCopied: string | null;
}

const Ctx = createContext<ShopBonusState | null>(null);

function applyWallet(summary: WalletSummary) {
  return {
    availableMinor: summary.available_minor,
    reservedMinor: summary.reserved_minor ?? 0,
    totalEarnedMinor: summary.total_earned_minor,
    totalSpentMinor: summary.total_spent_minor,
    savingsGoal: summary.savings_goal ?? null,
    balance: minorToMajor(summary.available_minor),
  };
}

export function ShopBonusProvider({ children }: { children: React.ReactNode }) {
  const { session, ready: sessionReady } = useSession();
  const { locale } = useLocale();
  const apiMode = Boolean(session?.user);

  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(0);
  const [availableMinor, setAvailableMinor] = useState(0);
  const [reservedMinor, setReservedMinor] = useState(0);
  const [totalEarnedMinor, setTotalEarnedMinor] = useState(0);
  const [totalSpentMinor, setTotalSpentMinor] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState<WalletSummary["savings_goal"]>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [financialRevision, setFinancialRevision] = useState(0);
  const [vouchers, setVouchers] = useState<MyVoucher[]>(seedVouchers);
  const [apiVouchers, setApiVouchers] = useState<ConsumerVoucher[]>([]);
  const [voucherStatus, setVoucherStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const voucherInFlight = useRef<{ owner: string; promise: Promise<void> } | null>(null);
  const voucherOwner = `${session?.user?.id ?? "guest"}:${locale}`;
  const voucherOwnerRef = useRef(voucherOwner);
  useEffect(() => {
    voucherOwnerRef.current = voucherOwner;
  }, [voucherOwner]);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    firstName: seedUser.firstName,
    lastName: seedUser.lastName,
    email: seedUser.email,
    phone: "",
    avatarUrl: null,
    notifications: { vouchers: true, reminders: true, inspiration: true },
  });
  const walletOwner = `${session?.user?.id ?? "guest"}:${locale}`;
  const walletOwnerRef = useRef(walletOwner);
  useEffect(() => { walletOwnerRef.current = walletOwner; }, [walletOwner]);
  const [verifiedWalletOwner, setVerifiedWalletOwner] = useState<string | null>(null);
  const refreshInFlight = useRef<{ owner: string; promise: Promise<WalletSummary | null> } | null>(null);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-2), { ...t, id }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!session?.user) {
      setWalletReady(true);
      return null;
    }
    const owner = `${session.user.id}:${locale}`;
    if (refreshInFlight.current?.owner === owner) return refreshInFlight.current.promise;
    setWalletReady(false);

    const run = (async () => {
      try {
        const summary = await fetchMeWallet(locale);
        if (walletOwnerRef.current !== owner) return null;
        if (![summary.available_minor, summary.reserved_minor ?? 0, summary.total_earned_minor, summary.total_spent_minor].every(amount => Number.isSafeInteger(amount) && amount >= 0)) {
          throw new Error("Invalid wallet summary");
        }
        const next = applyWallet(summary);
        setVerifiedWalletOwner(owner);
        setAvailableMinor(next.availableMinor);
        setReservedMinor(next.reservedMinor);
        setTotalEarnedMinor(next.totalEarnedMinor);
        setTotalSpentMinor(next.totalSpentMinor);
        setSavingsGoal(next.savingsGoal);
        setBalance(next.balance);
        setWalletError(null);
        setWalletReady(true);
        return summary;
      } catch (err) {
        if (walletOwnerRef.current !== owner) return null;
        setVerifiedWalletOwner(null);
        const message = err instanceof ApiError ? err.message : "Wallet kon niet worden geladen.";
        setAvailableMinor(0);
        setBalance(0);
        setReservedMinor(0);
        setSavingsGoal(null);
        setTotalEarnedMinor(0);
        setTotalSpentMinor(0);
        setWalletError(message);
        setWalletReady(false);
        return null;
      } finally {
        if (refreshInFlight.current?.owner === owner) refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = { owner, promise: run };
    return run;
  }, [session, locale]);

  const refreshVouchers = useCallback(
    async (filter: "all" | "active" | "used" | "expired" | "cancelled" = "all") => {
      if (!session?.user) return;
      // Keep the shared collection complete; each view applies its own filter.
      void filter;
      const owner = `${session.user.id}:${locale}`;
      if (voucherInFlight.current?.owner === owner) return voucherInFlight.current.promise;
      setVoucherStatus("loading");
      const promise = (async () => {
        try {
          const list = await fetchVouchers("all", locale);
          if (voucherOwnerRef.current !== owner) return;
          setApiVouchers(list);
          setVoucherStatus("ready");
        } catch (error) {
          if (voucherOwnerRef.current === owner) setVoucherStatus("error");
          throw error;
        } finally {
          if (voucherInFlight.current?.owner === owner) voucherInFlight.current = null;
        }
      })();
      voucherInFlight.current = { owner, promise };
      return promise;
    },
    [session, locale]
  );

  // Demo localStorage only when guest (never authoritative for logged-in ledger).
  useEffect(() => {
    queueMicrotask(() => {
      if (session?.user) {
        setHydrated(true);
        return;
      }
      try {
        const raw = localStorage.getItem("shopbonus-demo");
        if (raw) {
          const parsed = JSON.parse(raw);

          if (Array.isArray(parsed.vouchers)) setVouchers(parsed.vouchers);
          if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
          if (parsed.unlocked) setUnlocked(parsed.unlocked);
          if (parsed.profile) setProfile((p) => ({ ...p, ...parsed.profile }));
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);
      setWalletReady(true);
    });
  }, [session?.user]);

  useEffect(() => {
    if (!hydrated || apiMode) return;
    try {
      localStorage.setItem(
        "shopbonus-demo",
        JSON.stringify({ balance, vouchers, transactions, unlocked, profile })
      );
    } catch {
      /* ignore */
    }
  }, [hydrated, apiMode, balance, vouchers, transactions, unlocked, profile]);

  useEffect(() => {
    if (!sessionReady) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      if (!session?.user) {
        setApiVouchers([]);
        setVoucherStatus("idle");
        setAvailableMinor(0);
        setReservedMinor(0);
        setBalance(0);
        setVouchers([]);
        setWalletError(null);
        setWalletReady(true);
        return;
      }
      setProfile((p) => ({
        ...p,
        firstName: session.user.first_name || p.firstName,
        email: session.user.email || p.email,
      }));
      void refreshWallet();
      void refreshVouchers("all").catch(() => {
        /* directory / benefits surface their own voucher error states */
      });
    });
    return () => {
      cancelled = true;
    };
  }, [sessionReady, session?.user, refreshWallet, refreshVouchers]);

  const syncAuthoritative = useCallback(
    async (opts?: { toastReason?: string; silent?: boolean }) => {
      const summary = await refreshWallet();
      try {
        await refreshVouchers("all");
      } catch {
        /* keep prior voucher list; wallet summary still updated */
      }
      setFinancialRevision((n) => n + 1);
      if (!summary || opts?.silent) return;
      pushToast({
        title: "Tegoed bijgewerkt",
        message:
          opts?.toastReason === "debit"
            ? "Je ShopBonus-tegoed is bijgewerkt na een voucher."
            : "Je ShopBonus-tegoed is bijgewerkt.",
        kind: "success",
      });
    },
    [refreshWallet, refreshVouchers, pushToast]
  );

  // Reverb invalidation / reconnect → authoritative HTTP refetch (never trust event payload for money).
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      unsubscribe = await subscribeWalletInvalidation(session.user.id, {
        onInvalidate: (reason) => {
          if (cancelled) return;
          void syncAuthoritative({ toastReason: reason });
        },
        onReconnect: () => {
          if (cancelled) return;
          void syncAuthoritative({ silent: true });
        },
      });
    })();

    const onFocus = () => {
      void syncAuthoritative({ silent: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void syncAuthoritative({ silent: true });
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [session?.user?.id, syncAuthoritative]);

  const copyCode = useCallback(
    (code: string) => {
      try {
        void navigator.clipboard?.writeText(code);
      } catch {
        /* ignore */
      }
      setJustCopied(code);
      window.setTimeout(() => setJustCopied((c) => (c === code ? null : c)), 1800);
      pushToast({ title: locale === "en" ? "Code copied" : "Code gekopieerd", message: locale === "en" ? `${code} is on your clipboard.` : `${code} staat op je klembord.`, kind: "success" });
    },
    [pushToast, locale]
  );

  const revealAndCopyVoucher = useCallback(
    async (voucherId: string) => {
      if (!session?.user) return false;
      try {
        const detail = await fetchVoucherDetail(voucherId, locale);
        if (!detail.can_copy_code || !detail.code) {
          pushToast({
            title: "Code niet beschikbaar",
            message: "Deze voucher kan niet meer worden gekopieerd.",
            kind: "error",
          });
          return false;
        }
        copyCode(detail.code);
        return true;
      } catch (err) {
        pushToast({
          title: "Kopiëren mislukt",
          message: err instanceof ApiError ? err.message : "Probeer het later opnieuw.",
          kind: "error",
        });
        return false;
      }
    },
    [session?.user, locale, copyCode, pushToast]
  );

  const unlockOffer = useCallback(
    async (shopSlug: string, offerId: string) => {
      // Authenticated consumers use Laravel checkout only — never client-side dummy minting.
      if (!session?.user) {
        return { ok: false, reason: "Log in om deze aanbieding te ontgrendelen." };
      }
      const offerSlug = offerId.includes("-") || offerId.length > 8 ? offerId : `${shopSlug}-${offerId}`;
      try {
        const quote = await quoteCheckout(offerSlug, true, locale);
        if (quote.blockers?.length) {
          if (quote.blockers.some((b) => /wallet|balance|tegoed|insufficient/i.test(b))) {
            return { ok: false, reason: "onvoldoende-tegoed" };
          }
          return { ok: false, reason: quote.blockers[0] };
        }
        if (
          !window.confirm(
            `Bevestig: gebruik ${minorToMajor(quote.wallet_part_minor).toLocaleString("nl-NL", {
              style: "currency",
              currency: "EUR",
            })} tegoed voor deze voucher?`
          )
        ) {
          return { ok: false, reason: "Geannuleerd." };
        }
        const checkout = await startCheckout(offerSlug, newIdempotencyKey(), true, locale);
        await refreshWallet();
        await refreshVouchers("all");
        if (checkout.state === "completed" && checkout.voucher_id) {
          return { ok: true, voucherId: checkout.voucher_id };
        }
        if (checkout.payment?.checkout_url) {
          window.location.href = checkout.payment.checkout_url;
          return { ok: true };
        }
        return { ok: false, reason: checkout.failure_reason ?? "Checkout niet voltooid." };
      } catch (err) {
        return {
          ok: false,
          reason: err instanceof ApiError ? err.message : "Aankoop mislukt.",
        };
      }
    },
    [session?.user, locale, refreshWallet, refreshVouchers]
  );

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  const value = useMemo(
    () => ({
      balance: verifiedWalletOwner === walletOwner ? balance : 0,
      availableMinor: verifiedWalletOwner === walletOwner ? availableMinor : 0,
      reservedMinor: verifiedWalletOwner === walletOwner ? reservedMinor : 0,
      totalEarnedMinor: verifiedWalletOwner === walletOwner ? totalEarnedMinor : 0,
      totalSpentMinor: verifiedWalletOwner === walletOwner ? totalSpentMinor : 0,
      savingsGoal: verifiedWalletOwner === walletOwner ? savingsGoal : null,
      walletReady: walletReady && verifiedWalletOwner === walletOwner,
      walletError,
      financialRevision,
      apiMode,
      vouchers,
      apiVouchers,
      voucherStatus,
      transactions,
      profile,
      toasts,
      unlocked,
      pushToast,
      dismissToast,
      unlockOffer,
      updateProfile,
      copyCode,
      revealAndCopyVoucher,
      refreshWallet,
      refreshVouchers,
      justCopied,
    }),
    [
      walletOwner,
      verifiedWalletOwner,
      balance,
      availableMinor,
      reservedMinor,
      totalEarnedMinor,
      totalSpentMinor,
      savingsGoal,
      walletReady,
      walletError,
      financialRevision,
      apiMode,
      vouchers,
      apiVouchers,
      voucherStatus,
      transactions,
      profile,
      toasts,
      unlocked,
      pushToast,
      dismissToast,
      unlockOffer,
      updateProfile,
      copyCode,
      revealAndCopyVoucher,
      refreshWallet,
      refreshVouchers,
      justCopied,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopBonus(): ShopBonusState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShopBonus must be used within ShopBonusProvider");
  return ctx;
}
