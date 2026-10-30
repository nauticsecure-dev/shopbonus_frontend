"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  deriveUiRole,
  fetchMe,
  logoutAccount,
  type MeUser,
} from "@/lib/auth";
import { useLocale } from "@/i18n/LocaleContext";

export type AccountRole = "consumer" | "merchant" | "super_admin";

export type Session = {
  user: MeUser;
  /** Display convenience from server state — never authorize from this alone. */
  role: AccountRole;
  email: string;
};

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  refresh: () => Promise<MeUser | null>;
  setUser: (user: MeUser | null) => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function toSession(user: MeUser): Session {
  return {
    user,
    role: deriveUiRole(user),
    email: user.email,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const { locale, applyAccountLocale } = useLocale();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const setUser = useCallback((user: MeUser | null) => {
    setSession(user ? toSession(user) : null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const user = await fetchMe(locale);
      setUser(user);
      if (user?.locale) applyAccountLocale(user.locale);
      return user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  }, [locale, setUser, applyAccountLocale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try {
      await logoutAccount(locale);
    } catch {
      // Still drop local session so protected shells cannot keep the user in.
    } finally {
      setUser(null);
    }
  }, [locale, setUser]);

  const value = useMemo(
    () => ({ session, ready, refresh, setUser, signOut }),
    [session, ready, refresh, setUser, signOut]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession requires SessionProvider");
  return value;
}
