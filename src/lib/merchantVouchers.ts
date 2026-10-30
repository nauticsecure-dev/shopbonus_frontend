import { apiRequest } from "@/lib/api";

type Data<T> = { data: T };

function ws(path: string, workspaceId: string): string {
  return `/api/v1/workspaces/${workspaceId}${path}`;
}

/** Matches App\Models\VoucherDispute::REASONS. */
export const DISPUTE_REASONS = [
  { value: "code_invalid", label: "Code ongeldig" },
  { value: "code_already_used", label: "Code al gebruikt" },
  { value: "refused_by_webshop", label: "Geweigerd door webshop" },
  { value: "terms_differ", label: "Voorwaarden wijken af" },
  { value: "missing_after_payment", label: "Ontbreekt na betaling" },
  { value: "other", label: "Anders" },
] as const;

export type DisputeReason = (typeof DISPUTE_REASONS)[number]["value"];

export type VoucherStatus = "reserved" | "issued" | "redeemed" | "expired" | "cancelled" | string;

export type VoucherOrigin = "merchant_reward" | "answer24_claim" | "wallet_purchase" | "promotional" | string;

/** Merchant list row. Code is masked (****last4). No consumer identity. */
export type MerchantVoucher = {
  id: string;
  status: VoucherStatus;
  origin: VoucherOrigin;
  code: string | null;
  offer_id: string | null;
  offer_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
  reserved_at: string | null;
};

export type VoucherTerms = {
  name?: string | null;
  summary?: string | null;
  public_description?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  currency?: string | null;
  min_order_minor?: number | null;
  max_discount_minor?: number | null;
  ends_at?: string | null;
  claim_validity_days?: number | null;
  redemption_validity_days?: number | null;
  combinable?: boolean;
};

export type MerchantVoucherDetail = MerchantVoucher & {
  terms: VoucherTerms | null;
  redemption_source: string | null;
};

export type VoucherListMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type VoucherListFilters = {
  status?: string;
  offer?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  per_page?: number;
};

export type RedeemResult = {
  voucher_id: string;
  status: string;
  redeemed_at: string | null;
  source: string | null;
  reference: string | null;
};

export type DisputeTimelineEvent = {
  by: string;
  type: string;
  note: string | null;
  at: string;
};

/** Merchant dispute view: description and timeline, no consumer identity. */
export type MerchantDispute = {
  id: string;
  status: string;
  reason: string;
  description: string;
  has_screenshot: boolean;
  webshop: string | null;
  voucher_id: string | null;
  code_last4?: string | null;
  resolution: {
    note: string | null;
    compensation: string | null;
    amount_minor: number | null;
    at: string | null;
  } | null;
  created_at: string;
  timeline?: DisputeTimelineEvent[];
};

function queryString(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all") return;
    q.set(key, String(value));
  });
  const qs = q.toString();
  return qs ? `?${qs}` : "";
}

export async function listVouchers(
  workspaceId: string,
  filters: VoucherListFilters = {},
  signal?: AbortSignal
): Promise<{ data: MerchantVoucher[]; meta: VoucherListMeta }> {
  return apiRequest({
    path: ws(`/vouchers${queryString(filters)}`, workspaceId),
    signal,
  });
}

export async function fetchVoucher(workspaceId: string, voucherId: string): Promise<MerchantVoucherDetail> {
  const res = await apiRequest<Data<MerchantVoucherDetail>>({
    path: ws(`/vouchers/${voucherId}`, workspaceId),
  });
  return res.data;
}

export function exportVouchersUrl(workspaceId: string, filters: Omit<VoucherListFilters, "page" | "per_page"> = {}): string {
  return ws(`/vouchers/export${queryString(filters)}`, workspaceId);
}

export async function redeemVoucher(
  workspaceId: string,
  body: { code: string; reference?: string }
): Promise<RedeemResult> {
  const res = await apiRequest<Data<RedeemResult>>({
    path: ws("/vouchers/redeem", workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function openVoucherDispute(
  workspaceId: string,
  voucherId: string,
  body: { reason: DisputeReason | string; description: string }
): Promise<MerchantDispute> {
  const res = await apiRequest<Data<MerchantDispute>>({
    path: ws(`/vouchers/${voucherId}/dispute`, workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function listDisputes(workspaceId: string, status?: string, signal?: AbortSignal): Promise<MerchantDispute[]> {
  const res = await apiRequest<Data<MerchantDispute[]>>({
    path: ws(`/disputes${status && status !== "all" ? `?status=${encodeURIComponent(status)}` : ""}`, workspaceId),
    signal,
  });
  return res.data;
}

export async function respondDispute(workspaceId: string, disputeId: string, message: string): Promise<MerchantDispute> {
  const res = await apiRequest<Data<MerchantDispute>>({
    path: ws(`/disputes/${disputeId}/respond`, workspaceId),
    method: "POST",
    body: { message },
  });
  return res.data;
}

export function voucherStatusLabel(status: string): string {
  switch (status) {
    case "reserved":
      return "Gereserveerd";
    case "issued":
      return "Uitgegeven";
    case "redeemed":
      return "Ingewisseld";
    case "expired":
      return "Verlopen";
    case "cancelled":
      return "Geannuleerd";
    default:
      return status;
  }
}

export function voucherOriginLabel(origin: string): string {
  switch (origin) {
    case "merchant_reward":
      return "Beloning";
    case "answer24_claim":
      return "Claim";
    case "wallet_purchase":
      return "Wallet";
    case "promotional":
      return "Promotie";
    default:
      return origin;
  }
}

export function disputeReasonLabel(reason: string): string {
  return DISPUTE_REASONS.find((item) => item.value === reason)?.label ?? reason;
}

export function disputeStatusLabel(status: string): string {
  switch (status) {
    case "open":
      return "Open";
    case "under_review":
      return "In behandeling";
    case "waiting_for_merchant":
      return "Wacht op webshop";
    case "resolved":
      return "Opgelost";
    case "rejected":
      return "Afgewezen";
    default:
      return status;
  }
}

export function redemptionSourceLabel(source: string | null): string {
  if (!source) return "—";
  if (source === "merchant") return "Door webshop bevestigd";
  if (source === "order") return "Via betaalde bestelling";
  return source;
}

export function formatVoucherDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function shortVoucherRef(id: string): string {
  return id.slice(-8).toUpperCase();
}
