import type { CapabilityBadgeKind } from "@/lib/integrations";

const STYLES: Record<CapabilityBadgeKind, string> = {
  VERIFIED: "bg-green-50 text-green-800 border-green-200",
  LIMITED: "bg-amber-50 text-amber-900 border-amber-200",
  "SETUP REQUIRED": "bg-blue-50 text-blue-900 border-blue-200",
  BLOCKED: "bg-slate-200 text-slate-800 border-slate-300",
  UNSUPPORTED: "bg-slate-100 text-slate-700 border-slate-200",
  DISCONNECTED: "bg-slate-50 text-slate-600 border-slate-200",
  ERROR: "bg-red-50 text-red-800 border-red-200",
  "COMING SOON": "bg-violet-50 text-violet-900 border-violet-200",
};

export default function CapabilityBadge({
  kind,
  title,
  label,
  className = "",
}: {
  kind: CapabilityBadgeKind;
  title?: string;
  /** Optional prefix, e.g. capability key shown before the state. */
  label?: string;
  className?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${STYLES[kind]} ${className}`}
    >
      {label ? `${label} · ${kind}` : kind}
    </span>
  );
}
