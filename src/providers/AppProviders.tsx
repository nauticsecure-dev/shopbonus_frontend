"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "@/features/auth/SessionContext";
import { ShopBonusProvider } from "@/features/shopper/ShopBonusContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ShopBonusProvider>{children}</ShopBonusProvider>
    </SessionProvider>
  );
}
