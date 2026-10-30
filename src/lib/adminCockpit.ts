import { apiRequest } from "@/lib/api";
import { formatMinor } from "@/lib/money";

export type CockpitPeriod = "today" | "7d" | "30d" | "90d" | "custom";

export type CockpitCard = {
  key: string;
  label: string;
  value: number;
  display: string;
  change_percent: number | null;
  helper?: string;
  href: string;
  tone: "blue" | "amber" | "green" | "red" | string;
  icon: string;
  status?: string;
  breakdown?: Record<string, number>;
};

export type CockpitTrendDay = {
  date: string;
  vouchers_issued: number;
  vouchers_redeemed: number;
  new_webshops: number;
  new_consumers: number;
  paid_orders: number;
};

export type AffiliateChannel = {
  network: string;
  label: string;
  count: number;
  percent: number;
  href: string;
};

export type OpenActionItem = {
  count: number;
  severity: string;
  href: string;
  title: string;
  detail: string;
};

export type CockpitSummary = {
  generated_at: string;
  cache_seconds: number;
  period: { from: string; to: string };
  period_name: string;
  timezone: string;
  cards: CockpitCard[];
  kpis: Record<string, unknown>;
  trends: { timezone: string; days: CockpitTrendDay[]; degraded?: boolean };
  affiliate_channels: {
    metric: string;
    metric_label: string;
    total: number;
    period: { from: string; to: string };
    channels: AffiliateChannel[];
    degraded?: boolean;
  };
  attention: {
    open_actions: {
      pending_approvals: OpenActionItem;
      failed_syncs: OpenActionItem;
      open_support: OpenActionItem;
      total: number;
    };
    pending_approvals: Array<{ webshop_id: string; name: string }>;
    integration_failures: Array<{ connection_id: string; webshop: string; error_code: string | null }>;
  };
  sources: Record<string, string>;
  warnings: Array<{ code: string; message: string; request_id?: string }>;
  definitions: Record<string, string>;
};

export type ActivityItem = {
  id?: string;
  occurred_at: string;
  category: string;
  action: string;
  outcome: string;
  type: string;
  description: string;
  detail: string;
  href: string | null;
  actor: { id: string; email: string; name?: string } | null;
  webshop: { id: string; name: string } | null;
  request_id: string | null;
};

export function activityRowKey(item: ActivityItem, index: number): string {
  return item.id || `${item.occurred_at}-${item.action}-${item.request_id ?? ""}-${index}`;
}

export type SearchGroup = {
  type: string;
  label: string;
  results: Array<{ type: string; id: string; title: string; subtitle?: string; href: string }>;
};

type Data<T> = { data: T };

export async function fetchCockpit(
  period: CockpitPeriod = "30d",
  opts?: { from?: string; to?: string; signal?: AbortSignal }
): Promise<CockpitSummary> {
  const params = new URLSearchParams({ period });
  if (period === "custom" && opts?.from && opts?.to) {
    params.set("from", opts.from);
    params.set("to", opts.to);
  }
  const res = await apiRequest<Data<CockpitSummary>>({
    path: `/api/v1/admin/cockpit?${params}`,
    signal: opts?.signal,
  });
  return res.data;
}

export async function fetchCockpitActivity(
  opts?: { perPage?: number; signal?: AbortSignal }
): Promise<{ data: ActivityItem[]; meta: { total: number; current_page: number; last_page: number } }> {
  const perPage = opts?.perPage ?? 25;
  return apiRequest({
    path: `/api/v1/admin/activity?per_page=${perPage}`,
    signal: opts?.signal,
  });
}

export async function searchCockpit(
  q: string,
  signal?: AbortSignal
): Promise<{ query: string; groups: SearchGroup[] }> {
  const res = await apiRequest<Data<{ query: string; groups: SearchGroup[] }>>({
    path: `/api/v1/admin/search?q=${encodeURIComponent(q)}`,
    signal,
  });
  return res.data;
}

export async function fetchAdminVouchers(params: {
  status?: string;
  issued_on?: string;
  id?: string;
  from?: string;
  to?: string;
  signal?: AbortSignal;
}): Promise<{ data: Array<Record<string, unknown>>; meta: { total: number } }> {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (k !== "signal" && v) qs.set(k, String(v));
  });
  return apiRequest({
    path: `/api/v1/admin/vouchers?${qs}`,
    signal: params.signal,
  });
}

export function formatChange(change: number | null | undefined): string | undefined {
  if (change === null || change === undefined) return undefined;
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;
}

export function formatChartDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatWalletMinor(minor: number): string {
  return formatMinor(minor);
}

export const PERIOD_OPTIONS: { value: CockpitPeriod; label: string }[] = [
  { value: "7d", label: "7 dagen" },
  { value: "30d", label: "30 dagen" },
  { value: "90d", label: "90 dagen" },
];
