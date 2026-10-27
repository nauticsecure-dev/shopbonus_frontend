"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

export type AccountRole = "consumer" | "merchant";
type Session = { role: AccountRole; email: string };
const SessionContext = createContext<{
  session: Session | null;
  ready: boolean;
  signIn: (session: Session) => void;
  signOut: () => void;
} | null>(null);

// Browser-only demo session. Never store passwords or use this as server authorization.
let current: Session | null = null;
let initialized = false;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function snapshot() {
  if (!initialized) {
    initialized = true;
    try {
      const saved = JSON.parse(localStorage.getItem("shopbonus-session") || "null");
      if (saved && ["consumer", "merchant"].includes(saved.role) && typeof saved.email === "string") current = saved;
    } catch { /* Unavailable storage uses an in-memory session. */ }
  }
  return current;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(subscribe, snapshot, () => null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  function setSession(value: Session | null) { current = value; listeners.forEach(listener => listener()); }

  function signIn(value: Session) {
    setSession(value);
    try { localStorage.setItem("shopbonus-session", JSON.stringify(value)); } catch { /* Session still works in memory. */ }
  }
  function signOut() {
    setSession(null);
    try { localStorage.removeItem("shopbonus-session"); } catch { /* Session still clears in memory. */ }
  }
  return <SessionContext.Provider value={{ session, ready, signIn, signOut }}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession requires SessionProvider");
  return value;
}
