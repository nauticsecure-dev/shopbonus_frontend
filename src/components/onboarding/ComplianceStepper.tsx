"use client";

import { complianceStepLabel, type ComplianceStep } from "@/lib/workspaceCompliance";

const ORDER = ["business_details", "ownership", "agreement", "activation"] as const;

type Props = {
  steps: ComplianceStep[];
  currentKey: string;
  locale?: "nl" | "en";
};

function tone(status: string): string {
  if (status === "complete") return "bg-brand text-white border-brand";
  if (status === "in_progress" || status === "in_review" || status === "outdated") {
    return "bg-blue-50 text-brand border-brand";
  }
  if (status === "failed" || status === "rejected" || status === "suspended") {
    return "bg-red-50 text-red-600 border-red-200";
  }
  return "bg-white text-muted border-blue-100";
}

export default function ComplianceStepper({ steps, currentKey, locale = "nl" }: Props) {
  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.status]));

  return (
    <ol className="flex flex-wrap gap-2 sm:gap-3" aria-label="Onboardingvoortgang">
      {ORDER.map((key, index) => {
        const status = byKey[key] ?? "not_started";
        const active = currentKey === key;
        return (
          <li
            key={key}
            className={`flex min-w-[140px] flex-1 items-center gap-2 rounded-2xl border px-3 py-2.5 text-sm font-bold transition ${tone(status)} ${
              active ? "ring-2 ring-brand/30" : ""
            }`}
            aria-current={active ? "step" : undefined}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/80 text-xs font-black text-navy">
              {status === "complete" ? "✓" : index + 1}
            </span>
            <span className="leading-tight">
              <span className="block">{complianceStepLabel(key, locale)}</span>
              <span className="block text-[11px] font-semibold opacity-80">
                {status === "complete"
                  ? "Voltooid"
                  : status === "in_review"
                    ? "In review"
                    : status === "in_progress"
                      ? "Bezig"
                      : status === "failed"
                        ? "Mislukt"
                        : status === "outdated"
                          ? "Opnieuw accepteren"
                          : "Nog te doen"}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
