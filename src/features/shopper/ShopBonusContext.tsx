"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { subscribeWalletChannel } from "@/lib/echo";
import { useSession } from "@/features/auth/SessionContext";

export interface Toast {
  id: number;
  title: string;
  message: string;
  kind: "success" | "error" | "info";
}

type CtxValue = {
  balance: number | null;
  availableMinor: number | null;
  totalEarnedMinor: number | null;
  totalSpentMinor: number | null;
  profile: { firstName: string; email: string };
  toasts: Toast[];
  pushToast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: number) => void;
  copyCode: (code: string) => Promise<void>;
  justCopied: string | null;
  refreshWallet: () => Promise<void>;
};

const Ctx = createContext<CtxValue | null>(null);

type WalletPayload = {
  data: {
    available_minor?: number;
    total_earned_minor?: number;
    total_spent_minor?: number;
    balances?: { eur_credit?: { available: number; total_earned: number; total_spent: number } };
  };
};

export function ShopBonusProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const [wallet, setWallet] = useState<{
    owner: string;
    availableMinor: number | null;
    earnedMinor: number | null;
    spentMinor: number | null;
  }>({ owner: "", availableMinor: null, earnedMinor: null, spentMinor: null });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [justCopied, setJustCopied] = useState<string | null>(null);

  const pushToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((p) => [...p.slice(-2), { ...t, id }]);
    window.setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 5000);
  }, []);

  const refreshWallet = useCallback(async () => {
    if (!session?.email_verified) {
      setWallet({ owner: "", availableMinor: null, earnedMinor: null, spentMinor: null });
      return;
    }
    try {
      let payload: WalletPayload;
      try {
        payload = await api<WalletPayload>("me/wallet");
      } catch {
        payload = await api<WalletPayload>("consumer/wallet");
      }
      const available =
        payload.data.available_minor ?? payload.data.balances?.eur_credit?.available ?? 0;
      const earned =
        payload.data.total_earned_minor ?? payload.data.balances?.eur_credit?.total_earned ?? 0;
      const spent =
        payload.data.total_spent_minor ?? payload.data.balances?.eur_credit?.total_spent ?? 0;
      setWallet({
        owner: session.id,
        availableMinor: available,
        earnedMinor: earned,
        spentMinor: spent,
      });
    } catch {
      setWallet({ owner: "", availableMinor: null, earnedMinor: null, spentMinor: null });
    }
  }, [session]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  useEffect(() => {
    if (!session?.id || !session.email_verified) return;
    return subscribeWalletChannel(session.id, (payload) => {
      void refreshWallet().then(() => {
        if (payload.reason === "credit") {
          pushToast({
            title: "ShopBonus ontvangen",
            message: "Je tegoed is bijgewerkt.",
            kind: "success",
          });
        }
      });
    });
  }, [session?.id, session?.email_verified, refreshWallet, pushToast]);

  const profile = useMemo(
    () => ({ firstName: session?.first_name || "", email: session?.email || "" }),
    [session],
  );

  const copyCode = useCallback(
    async (code: string) => {
      try {
        await navigator.clipboard.writeText(code);
        setJustCopied(code);
        window.setTimeout(() => setJustCopied(null), 1800);
        pushToast({ title: "Code gekopieerd", message: "De code staat op je klembord.", kind: "success" });
      } catch {
        pushToast({
          title: "Kopiëren mislukt",
          message: "Selecteer en kopieer de code handmatig.",
          kind: "error",
        });
      }
    },
    [pushToast],
  );

  const owned = session?.id === wallet.owner;
  const value: CtxValue = {
    balance: owned && wallet.availableMinor != null ? wallet.availableMinor / 100 : null,
    availableMinor: owned ? wallet.availableMinor : null,
    totalEarnedMinor: owned ? wallet.earnedMinor : null,
    totalSpentMinor: owned ? wallet.spentMinor : null,
    profile,
    toasts,
    pushToast,
    dismissToast: (id) => setToasts((p) => p.filter((t) => t.id !== id)),
    copyCode,
    justCopied,
    refreshWallet,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShopBonus() {
  const value = useContext(Ctx);
  if (!value) throw new Error("ShopBonusProvider required");
  return value;
}
