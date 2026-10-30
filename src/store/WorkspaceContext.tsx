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
  const workspaces = session?.user.workspaces ?? [];
  const serverCurrent = workspaces.find((w) => w.is_current) ?? workspaces[0] ?? null;
  const [overrideId, setOverrideId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (overrideId && !workspaces.some((w) => w.id === overrideId)) {
      setOverrideId(null);
    }
  }, [overrideId, workspaces]);

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

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
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
