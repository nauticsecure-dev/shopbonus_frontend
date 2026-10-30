import type { ReactNode } from "react";
import Link from "next/link";
import DashboardIcon, { type DashboardIconName } from "@/components/DashboardIcon";

export function DashboardHeading({
  eyebrow,
  title,
  accent,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>}
        <h1 className="mt-1 text-[clamp(2rem,5vw,3.55rem)] font-black leading-[1.04] tracking-tight text-navy">
          {title} {accent && <span className="text-brand">{accent}</span>}
        </h1>
        {subtitle && <p className="mt-2 text-base text-muted sm:text-lg">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function DashboardStatCard({
  label,
  value,
  change,
  helper,
  icon,
  tone = "blue",
  href,
  loading = false,
}: {
  label: string;
  value: string;
  change?: string;
  helper?: string;
  icon: DashboardIconName;
  tone?: "blue" | "green" | "amber" | "red";
  href?: string;
  loading?: boolean;
}) {
  const iconTone = {
    blue: "bg-blue-50 text-brand",
    green: "bg-green-50 text-green-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-500",
  }[tone];
  const changeTone = tone === "amber" || tone === "red" ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700";

  const body = (
    <div className="flex items-start gap-3 sm:gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl sm:h-14 sm:w-14 ${iconTone}`}>
        <DashboardIcon name={icon} size={25} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 min-h-[2.4em] text-[13px] font-bold leading-snug text-muted sm:text-sm">{label}</p>
        <p className="mt-1 truncate text-[26px] font-black leading-none tracking-tight text-navy sm:text-[32px]">
          {loading ? "…" : value}
        </p>
        {(change || helper) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {change && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ${changeTone}`}>
                <DashboardIcon name="arrow" size={13} className="-rotate-45" />
                {change}
              </span>
            )}
            {helper && <span className="text-[11px] font-semibold text-muted sm:text-xs">{helper}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const className =
    "min-w-0 rounded-[1.35rem] border border-blue-100/70 bg-white p-4 shadow-[0_8px_26px_-18px_rgba(10,27,63,0.28)] sm:p-5" +
    (href ? " transition hover:border-brand/40 hover:shadow-[0_10px_28px_-16px_rgba(11,116,255,0.35)]" : "");

  if (href) {
    return (
      <Link href={href} className={`block ${className}`}>
        {body}
      </Link>
    );
  }

  return <article className={className}>{body}</article>;
}

export function Panel({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  return <section id={id} className={`rounded-[1.5rem] border border-blue-100/70 bg-white p-4 shadow-[0_8px_26px_-18px_rgba(10,27,63,0.28)] sm:p-6 ${className}`}>{children}</section>;
}

export function PanelHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-black tracking-tight text-navy sm:text-xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const cls =
    status === "Actief" ||
    status === "Beschikbaar" ||
    status === "Goedgekeurd" ||
    status === "Geverifieerd" ||
    status === "Gezond" ||
    status === "Opgelost"
      ? "bg-green-50 text-green-700"
      : status === "Gepauzeerd" ||
          status === "Uitgegeven" ||
          status === "Gereserveerd" ||
          status === "In behandeling" ||
          status === "Ingewisseld" ||
          status === "Gepland" ||
          status === "Wacht op webshop"
        ? "bg-blue-50 text-blue-700"
        : status === "Uitverkocht" ||
            status === "Aandacht nodig" ||
            status === "Instellen vereist" ||
            status === "In beoordeling" ||
            status === "Open"
          ? "bg-amber-50 text-amber-700"
          : status === "Ongeldig" ||
              status === "Afgekeurd" ||
              status === "Verlopen" ||
              status === "Beëindigd" ||
              status === "Geannuleerd" ||
              status === "Afgewezen" ||
              status === "Opgeschort" ||
              status === "Niet verbonden"
            ? "bg-red-50 text-red-700"
            : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-extrabold ${cls}`}>
      <span className="h-2 w-2 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function DashboardLineChart({
  values,
  id = "dashboard-line",
  labels = [],
  dates = [],
  color = "#0b74ff",
  height = 250,
  ySuffix = "",
  onPointClick,
  emptyLabel = "Nog geen claims in deze periode.",
}: {
  values: number[];
  id?: string;
  labels?: string[];
  /** ISO dates parallel to values — used for hover titles and click handlers. */
  dates?: string[];
  color?: string;
  height?: number;
  ySuffix?: string;
  onPointClick?: (index: number, date?: string, value?: number) => void;
  emptyLabel?: string;
}) {
  const width = 900;
  const left = 42;
  const right = 12;
  const top = 16;
  const bottom = 34;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const max = Math.max(...values, 1) * 1.12;
  const min = Math.min(0, ...values);
  const range = max - min || 1;
  const coords = values.map((v, i) => ({
    x: left + (values.length <= 1 ? 0 : (i / (values.length - 1)) * plotW),
    y: top + plotH - ((v - min) / range) * plotH,
  }));
  const line = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${(left + plotW).toFixed(1)},${(top + plotH).toFixed(1)} L${left},${(top + plotH).toFixed(1)} Z`;
  const gridValues = [0, 0.25, 0.5, 0.75, 1];
  const labelIndexes = labels.length > 0
    ? Array.from(new Set([0, Math.floor((labels.length - 1) / 3), Math.floor(((labels.length - 1) * 2) / 3), labels.length - 1]))
    : [];
  const allZero = values.length > 0 && values.every((v) => v === 0);

  if (values.length === 0) {
    return (
      <div className="grid h-[225px] place-items-center rounded-2xl bg-blue-50/40 text-sm font-semibold text-muted">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden">
      {allZero && (
        <p className="mb-2 text-center text-xs font-semibold text-muted">{emptyLabel}</p>
      )}
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Trendgrafiek">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.015" />
          </linearGradient>
        </defs>
        {gridValues.map((ratio) => {
          const y = top + plotH - ratio * plotH;
          const value = Math.round(min + ratio * range);
          return (
            <g key={ratio}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#e8eff9" strokeDasharray="4 5" />
              <text x={left - 9} y={y + 4} textAnchor="end" fontSize="11" fill="#8291ae">
                {value.toLocaleString("nl-NL")}{ySuffix}
              </text>
            </g>
          );
        })}
        <path d={area} fill={`url(#${id}-fill)`} />
        <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {coords.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={values.length > 18 ? 3.5 : 5}
            fill={color}
            stroke="white"
            strokeWidth="2"
            className={onPointClick ? "cursor-pointer" : undefined}
            onClick={() => onPointClick?.(i, dates[i], values[i])}
          >
            <title>{`${labels[i] ?? dates[i] ?? `#${i + 1}`}: ${values[i].toLocaleString("nl-NL")}${ySuffix}`}</title>
          </circle>
        ))}
        {labelIndexes.map((index) => {
          const x = coords[index]?.x ?? left;
          return (
            <text key={index} x={x} y={height - 8} textAnchor={index === 0 ? "start" : index === labels.length - 1 ? "end" : "middle"} fontSize="11" fill="#7585a5">
              {labels[index]}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
