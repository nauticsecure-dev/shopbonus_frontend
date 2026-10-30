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
  /** Pending cashback in minor units — not spendable until settlement. */
  pendingCashbackMinor: number;
  reservedMinor: number;
  totalEarnedMinor: number;
  totalSpentMinor: number;
  savingsGoal: WalletSummary["savings_goal"];
  walletReady: boolean;
  walletError: string | null;
  apiMode: boolean;
  vouchers: MyVoucher[];
  apiVouchers: ConsumerVoucher[];
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
    pendingCashbackMinor: summary.pending_cashback_minor ?? summary.pending_minor ?? 0,
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
  const [balance, setBalance] = useState(42.5);
  const [availableMinor, setAvailableMinor] = useState(4250);
  const [pendingCashbackMinor, setPendingCashbackMinor] = useState(0);
  const [reservedMinor, setReservedMinor] = useState(0);
  const [totalEarnedMinor, setTotalEarnedMinor] = useState(0);
  const [totalSpentMinor, setTotalSpentMinor] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState<WalletSummary["savings_goal"]>(null);
  const [walletReady, setWalletReady] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [vouchers, setVouchers] = useState<MyVoucher[]>(seedVouchers);
  const [apiVouchers, setApiVouchers] = useState<ConsumerVoucher[]>([]);
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
  const refreshInFlight = useRef<Promise<WalletSummary | null> | null>(null);

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
    if (refreshInFlight.current) return refreshInFlight.current;

    const run = (async () => {
      try {
        const summary = await fetchMeWallet(locale);
        const next = applyWallet(summary);
        setAvailableMinor(next.availableMinor);
        setPendingCashbackMinor(next.pendingCashbackMinor);
        setReservedMinor(next.reservedMinor);
        setTotalEarnedMinor(next.totalEarnedMinor);
        setTotalSpentMinor(next.totalSpentMinor);
        setSavingsGoal(next.savingsGoal);
        setBalance(next.balance);
        setWalletError(null);
        setWalletReady(true);
        return summary;
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Wallet kon niet worden geladen.";
        setWalletError(message);
        setWalletReady(true);
        return null;
      } finally {
        refreshInFlight.current = null;
      }
    })();

    refreshInFlight.current = run;
    return run;
  }, [session?.user, locale]);

  const refreshVouchers = useCallback(
    async (filter: "all" | "active" | "used" | "expired" | "cancelled" = "all") => {
      if (!session?.user) return;
      try {
        const list = await fetchVouchers(filter, locale);
        setApiVouchers(list);
      } catch {
        /* page surfaces empty / error state */
      }
    },
    [session?.user, locale]
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
          if (typeof parsed.balance === "number") {
            setBalance(parsed.balance);
            setAvailableMinor(Math.round(parsed.balance * 100));
          }
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
    if (!session?.user) {
      setAvailableMinor(0);
      setPendingCashbackMinor(0);
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
    void refreshVouchers("all");
  }, [sessionReady, session?.user, refreshWallet, refreshVouchers]);

  // Reverb invalidation → authoritative HTTP refetch (never trust event payload for money).
  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void (async () => {
      unsubscribe = await subscribeWalletInvalidation(session.user.id, (reason) => {
        if (cancelled) return;
        void refreshWallet().then((summary) => {
          if (!summary) return;
          pushToast({
            title: "Tegoed bijgewerkt",
            message:
              reason === "debit"
                ? "Je ShopBonus-tegoed is bijgewerkt na een voucher."
                : "Je ShopBonus-tegoed is bijgewerkt.",
            kind: "success",
          });
          void refreshVouchers("all");
        });
      });
    })();

    const onFocus = () => {
      void refreshWallet();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") void refreshWallet();
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
    };
  }, [session?.user?.id, refreshWallet, refreshVouchers, pushToast]);

  const copyCode = useCallback(
    (code: string) => {
      try {
        void navigator.clipboard?.writeText(code);
      } catch {
        /* ignore */
      }
      setJustCopied(code);
      window.setTimeout(() => setJustCopied((c) => (c === code ? null : c)), 1800);
      pushToast({ title: "Code gekopieerd", message: `${code} staat op je klembord.`, kind: "success" });
    },
    [pushToast]
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
      balance,
      availableMinor,
      pendingCashbackMinor,
      reservedMinor,
      totalEarnedMinor,
      totalSpentMinor,
      savingsGoal,
      walletReady,
      walletError,
      apiMode,
      vouchers,
      apiVouchers,
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
      balance,
      availableMinor,
      pendingCashbackMinor,
      reservedMinor,
      totalEarnedMinor,
      totalSpentMinor,
      savingsGoal,
      walletReady,
      walletError,
      apiMode,
      vouchers,
      apiVouchers,
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
