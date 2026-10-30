"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import SupportExperience from "@/components/support/SupportExperience";
import { useOptionalWorkspace } from "@/store/WorkspaceContext";

function WorkspaceSupportInner() {
  const params = useSearchParams();
  const workspace = useOptionalWorkspace();
  const current = workspace?.current;
  const summary = useMemo(
    () =>
      current
        ? {
            title: current.name,
            lines: [
              `Status: ${current.status}`,
              "Alleen geautoriseerde webshopgegevens worden gebruikt in antwoorden.",
              "Consumenten-walletgegevens worden niet getoond.",
            ],
          }
        : null,
    [current]
  );

  return (
    <SupportExperience
      mode="workspace"
      workspaceId={workspace?.workspaceId ?? null}
      workspaceSummary={summary}
      initialConversationId={params.get("conversation")}
    />
  );
}

export default function WorkspaceSupportPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<p className="p-8 text-sm text-muted">Support laden…</p>}>
        <div className="-mx-4 -mt-2 sm:-mx-6 xl:-mx-8">
          <WorkspaceSupportInner />
        </div>
      </Suspense>
    </DashboardShell>
  );
}
