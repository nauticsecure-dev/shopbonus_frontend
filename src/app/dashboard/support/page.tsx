"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { useLocale } from "@/i18n/LocaleContext";
import SupportExperience from "@/components/support/SupportExperience";
import { useOptionalWorkspace } from "@/store/WorkspaceContext";

function WorkspaceSupportInner() {
  const params = useSearchParams();
  const { locale } = useLocale();
  const workspace = useOptionalWorkspace();
  const current = workspace?.current;
  const summary = useMemo(
    () =>
      current
        ? {
            title: current.name,
            lines: [
              `Status: ${current.status}`,
              locale === "en" ? "Answers use authorized workspace information." : "Alleen geautoriseerde webshopgegevens worden gebruikt in antwoorden.",
              locale === "en" ? "Consumer wallet data is not shown here." : "Consumenten-walletgegevens worden niet getoond.",
            ],
          }
        : null,
    [current, locale]
  );

  return (
    <SupportExperience
      key={workspace?.workspaceId}
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
      <Suspense fallback={<p className="p-8 text-sm text-muted">Support…</p>}>
        <div className="-mx-4 -mt-2 sm:-mx-6 xl:-mx-8">
          <WorkspaceSupportInner />
        </div>
      </Suspense>
    </DashboardShell>
  );
}
