"use client";

import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "@/store/SessionContext";
import { selectWorkspace } from "@/lib/merchantDashboard";
import type { MeWorkspace } from "@/lib/auth";

type WorkspaceContextValue = {
  workspaces: MeWorkspace[];
  current: MeWorkspace | null;
  workspaceId: string;
  switching: boolean;
  select: (workspaceId: string) => Promise<void>;
  /** Bumps when the selected workspace changes so pages can refetch. */
  revision: number;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { session, refresh } = useSession();
  const workspaces = useMemo(() => session?.user.workspaces ?? [], [session?.user.workspaces]);
  const serverCurrent = workspaces.find((w) => w.is_current) ?? workspaces[0] ?? null;
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [revision, setRevision] = useState(0);
  const checkingAccess = useRef(false);
  useEffect(() => {
    const revalidate = () => {
      if (checkingAccess.current) return;
      checkingAccess.current = true;
      void refresh().finally(() => { checkingAccess.current = false; });
    };
    window.addEventListener("shopbonus:workspace-access-check", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      window.removeEventListener("shopbonus:workspace-access-check", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [refresh]);

  const current =
    (overrideId ? workspaces.find((w) => w.id === overrideId) : null) ?? serverCurrent;

  const select = useCallback(
    async (workspaceId: string) => {
      if (!workspaceId || workspaceId === current?.id) return;
      setSwitching(true);
      try {
        await selectWorkspace(workspaceId);
        setOverrideId(workspaceId);
        setRevision((n) => n + 1);
        await refresh();
      } finally {
        setSwitching(false);
      }
    },
    [current?.id, refresh]
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      workspaces,
      current,
      workspaceId: current?.id ?? "current",
      switching,
      select,
      revision,
    }),
    [workspaces, current, switching, select, revision]
  );

  return <WorkspaceContext.Provider value={value}>
    {switching ? <p role="status">Webshop selecteren…</p> : current && current.status !== "suspended" ? <Fragment key={`${session?.user.id}:${current.id}`}>{children}</Fragment> : <p role="alert">Geen toegankelijke webshop beschikbaar.</p>}
  </WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("useWorkspace requires WorkspaceProvider");
  return value;
}

/** Safe for shells shared with admin routes that may sit outside WorkspaceProvider. */
export function useOptionalWorkspace() {
  return useContext(WorkspaceContext);
}
