import { apiRequest } from "@/lib/api";

export type MerchantAnalytics = {
  from: string; to: string; timezone: string; generated_at: string;
  orders: Record<string, { paid_orders: number; net_minor: number }>;
  sales_series: { date: string; paid_orders: number; orders: Record<string, { paid_orders: number; net_minor: number }> }[];
  vouchers: { issued: number; redeemed: number; reserved: number };
  answer24: { claims: number };
  banner_metrics: { status: string; viewable_impressions?: number; cta_clicks?: number; ctr?: number | null };
  attribution: Record<string, { orders: number; by_currency: Record<string, { net_revenue_minor: number }> } | string>;
  network: { as_referrer: { journeys: number }; as_receiver: { journeys: number } };
};

export async function fetchMerchantAnalytics(workspaceId: string, days: number, signal?: AbortSignal): Promise<MerchantAnalytics> {
  const base = `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analytics/overview`;
  return (await apiRequest<{ data: MerchantAnalytics }>({ path: `${base}?days=${days}`, signal })).data;
}

export type AttributionOrders = { data: { id: string; reference: string | null; attribution_type: string; net_minor: number; currency: string; paid_at: string }[]; meta: { current_page: number; last_page: number; total: number } };

export function fetchAttributionOrders(workspaceId: string, report: MerchantAnalytics, type: string, page: number, signal: AbortSignal): Promise<AttributionOrders> {
  const q = new URLSearchParams({ from: report.sales_series[0].date, to: report.sales_series.at(-1)!.date, type, page: String(page) });
  return apiRequest({ path: `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/analytics/attribution/orders?${q}`, signal });
}
