"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, ApiError, mutate } from "@/lib/api";
export type AccountRole = "consumer" | "merchant";
export type Identity = { id: string; first_name: string; email: string; email_verified: boolean; onboarding_intent: AccountRole; roles: string[]; destination: string; workspaces: { id: string; name: string; role: string; status: string; is_current: boolean }[] };
type Session = Identity & { role: AccountRole };
const SessionContext = createContext<{session: Session | null; ready: boolean; error: string; refresh: () => Promise<Session | null>; signIn: () => Promise<Session | null>; signOut: () => Promise<void>} | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      const { data } = await api<{ data: Identity }>("me");
      const value: Session = { ...data, role: data.workspaces.length || data.onboarding_intent === "merchant" ? "merchant" : "consumer" };
      setSession(value); setError(""); return value;
    } catch (cause) {
      setSession(null);
      setError(cause instanceof ApiError && cause.status === 401 ? "" : cause instanceof Error ? cause.message : "Sessie laden mislukt.");
      return null;
    } finally { setReady(true); }
  }, []);
  useEffect(() => { queueMicrotask(() => { void refresh(); }); }, [refresh]);
  async function signOut() {
    try { await mutate("/logout"); setSession(null); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Uitloggen mislukt."); throw cause; }
  }
  return <SessionContext.Provider value={{ session, ready, error, refresh, signIn: refresh, signOut }}>{children}</SessionContext.Provider>;
}
export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession requires SessionProvider");
  return value;
}
