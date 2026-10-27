"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  MyVoucher,
  Transaction,
  myVouchers as seedVouchers,
  transactions as seedTransactions,
  user as seedUser,
  webshops,
} from "@/fixtures/dummy";

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
  notifications: { vouchers: boolean; reminders: boolean; inspiration: boolean };
}

interface ShopBonusState {
  balance: number;
  vouchers: MyVoucher[];
  transactions: Transaction[];
  profile: Profile;
  toasts: Toast[];
  unlocked: Record<string, string>;
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  unlockOffer: (shopSlug: string, offerId: string) => { ok: boolean; code?: string; reason?: string };
  updateProfile: (p: Partial<Profile>) => void;
  copyCode: (code: string) => void;
  justCopied: string | null;
}

const Ctx = createContext<ShopBonusState | null>(null);

function randomCode(prefix: string): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `${prefix}-${s}`;
}

function prefixFor(shopName: string, value: number, type: string): string {
  const clean = shopName.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
  return `${clean}${value}${type === "percent" ? "" : ""}`;
}

const todayLabel = () => {
  const d = new Date();
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" });
};

export function ShopBonusProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [balance, setBalance] = useState(42.5);
  const [vouchers, setVouchers] = useState<MyVoucher[]>(seedVouchers);
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [unlocked, setUnlocked] = useState<Record<string, string>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justCopied, setJustCopied] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>({
    firstName: seedUser.firstName,
    lastName: seedUser.lastName,
    email: seedUser.email,
    phone: "",
    notifications: { vouchers: true, reminders: true, inspiration: true },
  });

  // Load persisted state (demo only)
  useEffect(() => {
    queueMicrotask(() => {
    try {
      const raw = localStorage.getItem("shopbonus-demo");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.balance === "number") setBalance(parsed.balance);
        if (Array.isArray(parsed.vouchers)) setVouchers(parsed.vouchers);
        if (Array.isArray(parsed.transactions)) setTransactions(parsed.transactions);
        if (parsed.unlocked) setUnlocked(parsed.unlocked);
        if (parsed.profile) setProfile((p) => ({ ...p, ...parsed.profile }));
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        "shopbonus-demo",
        JSON.stringify({ balance, vouchers, transactions, unlocked, profile })
      );
    } catch {
      /* ignore */
    }
  }, [hydrated, balance, vouchers, transactions, unlocked, profile]);

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

  const copyCode = useCallback(
    (code: string) => {
      try {
        navigator.clipboard?.writeText(code);
      } catch {
        /* ignore */
      }
      setJustCopied(code);
      window.setTimeout(() => setJustCopied((c) => (c === code ? null : c)), 1800);
      pushToast({ title: "Code gekopieerd", message: `${code} staat op je klembord.`, kind: "success" });
    },
    [pushToast]
  );

  const unlockOffer = useCallback(
    (shopSlug: string, offerId: string) => {
      const shop = webshops.find((w) => w.slug === shopSlug);
      const offer = shop?.offers.find((o) => o.id === offerId);
      if (!shop || !offer) return { ok: false, reason: "Aanbieding niet gevonden." };
      const key = `${shopSlug}:${offerId}`;
      if (unlocked[key]) return { ok: true, code: unlocked[key] };
      if (balance < offer.cost) {
        return { ok: false, reason: "onvoldoende-tegoed" };
      }
      const code = randomCode(prefixFor(shop.name, offer.value, offer.type));
      setBalance((b) => Math.round((b - offer.cost) * 100) / 100);
      setUnlocked((u) => ({ ...u, [key]: code }));
      const expiry = new Date(Date.now() + offer.validityDays * 86400000).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const voucher: MyVoucher = {
        id: `v-${Date.now()}`,
        shopSlug: shop.slug,
        shopName: shop.name,
        tagline: shop.tagline,
        tags: shop.tags,
        image: shop.banner,
        logoText: shop.logoText,
        logoBg: shop.logoBg,
        logoColor: shop.logoColor,
        type: offer.type,
        value: offer.value,
        minOrder: offer.minOrder,
        maxDiscount: offer.maxDiscount ?? offer.value,
        code,
        status: "active",
        daysLeft: offer.validityDays,
        expiryLabel: `t/m ${expiry}`,
      };
      setVouchers((v) => [voucher, ...v]);
      setTransactions((t) => [
        {
          id: `t-${Date.now()}`,
          type: "debit",
          title: "Voucher gebruikt",
          subtitle: shop.name,
          date: todayLabel(),
          amount: offer.cost,
        },
        ...t,
      ]);
      return { ok: true, code };
    },
    [balance, unlocked]
  );

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  const value = useMemo(
    () => ({
      balance,
      vouchers,
      transactions,
      profile,
      toasts,
      unlocked,
      pushToast,
      dismissToast,
      unlockOffer,
      updateProfile,
      copyCode,
      justCopied,
    }),
    [balance, vouchers, transactions, profile, toasts, unlocked, pushToast, dismissToast, unlockOffer, updateProfile, copyCode, justCopied]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopBonus(): ShopBonusState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useShopBonus must be used within ShopBonusProvider");
  return ctx;
}
