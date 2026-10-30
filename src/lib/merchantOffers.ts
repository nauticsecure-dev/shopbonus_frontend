import { apiRequest, apiUpload, ApiError } from "@/lib/api";
import { formatMinor } from "@/lib/money";
import {
  commitCodeImport,
  createOffer,
  fetchOffer,
  listOffers,
  offerBodyFromForm,
  previewCodeImport,
  updateOffer,
  uploadCodeImport,
  type CodeImportBatch,
  type CostPreview,
  type OfferPayload,
} from "@/lib/onboarding";
import { offerStatusLabel, offerTypeLabel } from "@/lib/merchantDashboard";

export type { CodeImportBatch, CostPreview, OfferPayload };
export {
  ApiError,
  commitCodeImport,
  createOffer,
  fetchOffer,
  listOffers,
  offerBodyFromForm,
  previewCodeImport,
  updateOffer,
  uploadCodeImport,
  offerStatusLabel,
  offerTypeLabel,
};

type Data<T> = { data: T };

export type OfferAcquisition = "merchant_reward" | "wallet_purchase" | "promotional_code" | string;

export type CodeCounters = {
  total: number;
  available: number;
  reserved: number;
  issued: number;
  redeemed: number;
  expired: number;
  invalid: number;
  cancelled: number;
};

export type CodeAssigned = {
  voucher_id: string;
  origin: string;
  voucher_status: string;
  consumer: string | null;
  claim_expires_at: string | null;
  expires_at: string | null;
} | null;

export type InventoryCode = {
  id: string;
  code: string;
  status: string;
  reusable: boolean;
  uses_count: number;
  platform_validation: string;
  batch_id: string | null;
  assigned: CodeAssigned;
  reserved_at: string | null;
  issued_at: string | null;
  redeemed_at: string | null;
  invalidated_at: string | null;
  invalid_reason: string | null;
  created_at: string;
};

export type CodesPage = {
  data: InventoryCode[];
  meta: {
    counters: CodeCounters;
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
  };
};

export type CodeHistoryEvent = {
  type: string;
  from_status: string | null;
  to_status: string | null;
  summary: Record<string, unknown> | null;
  recorded_at: string;
};

export type PlatformVerification = {
  platform_validation: string;
  detail: Record<string, unknown>;
};

function ws(path: string, workspaceId: string): string {
  return `/api/v1/workspaces/${workspaceId}${path}`;
}

export async function pauseOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/pause`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function activateOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/activate`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function publishOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/publish`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function resumeOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/resume`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function archiveOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/archive`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function duplicateOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/duplicate`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function endOffer(offerId: string, workspaceId: string): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}/end`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function fetchOfferCodes(
  offerId: string,
  workspaceId: string,
  params: Record<string, string | number | boolean | undefined> = {},
  signal?: AbortSignal
): Promise<CodesPage> {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === "all") return;
    q.set(key, String(value));
  });
  const qs = q.toString();
  return apiRequest<CodesPage>({
    path: ws(`/offers/${offerId}/codes${qs ? `?${qs}` : ""}`, workspaceId),
    signal,
  });
}

export async function revealCode(codeId: string, workspaceId: string): Promise<{ id: string; code: string }> {
  const res = await apiRequest<Data<{ id: string; code: string }>>({
    path: ws(`/codes/${codeId}/reveal`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function invalidateCode(codeId: string, workspaceId: string, reason: string): Promise<InventoryCode> {
  const res = await apiRequest<Data<InventoryCode>>({
    path: ws(`/codes/${codeId}/invalidate`, workspaceId),
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function fetchCodeHistory(codeId: string, workspaceId: string): Promise<CodeHistoryEvent[]> {
  const res = await apiRequest<Data<CodeHistoryEvent[]>>({
    path: ws(`/codes/${codeId}/history`, workspaceId),
  });
  return res.data;
}

export async function verifyCodePlatform(
  codeId: string,
  workspaceId: string,
  body: { mode: "provider_check" | "manual_confirm"; note?: string }
): Promise<{ data: InventoryCode; verification: PlatformVerification }> {
  return apiRequest({
    path: ws(`/codes/${codeId}/platform-validation`, workspaceId),
    method: "POST",
    body,
  });
}

export function importTemplateUrl(offerId: string, workspaceId: string): string {
  return ws(`/offers/${offerId}/codes/import-template`, workspaceId);
}

export function exportCodesUrl(
  offerId: string,
  workspaceId: string,
  params: Record<string, string | undefined> = {}
): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) q.set(key, value);
  });
  const qs = q.toString();
  return ws(`/offers/${offerId}/codes/export${qs ? `?${qs}` : ""}`, workspaceId);
}

export function acquisitionLabel(acquisition: string): string {
  switch (acquisition) {
    case "merchant_reward":
      return "Beloning na aankoop";
    case "wallet_purchase":
      return "Aankoop met wallet-tegoed";
    case "promotional_code":
      return "Promotiecode via ShopBonus";
    default:
      return acquisition;
  }
}

export function acquisitionHint(acquisition: string): string {
  switch (acquisition) {
    case "merchant_reward":
      return "Klant verdient deze voucher bij een eerste aankoop en gebruikt hem bij een volgende bestelling.";
    case "wallet_purchase":
      return "Klant koopt de voucher met wallet-tegoed (eventueel aangevuld via Mollie).";
    case "promotional_code":
      return "Bestaande merchant-promotiecode die via ShopBonus wordt uitgegeven.";
    default:
      return "";
  }
}

export function codeStatusLabel(status: string): string {
  switch (status) {
    case "available":
      return "Beschikbaar";
    case "reserved":
      return "Gereserveerd";
    case "issued":
      return "Uitgegeven";
    case "redeemed":
      return "Ingewisseld";
    case "expired":
      return "Verlopen";
    case "invalid":
      return "Ongeldig";
    case "cancelled":
      return "Geannuleerd";
    default:
      return status;
  }
}

export function platformValidationLabel(status: string): string {
  switch (status) {
    case "verified":
      return "Geverifieerd";
    case "verification_pending":
      return "Verificatie loopt";
    case "merchant_verification_required":
      return "Merchantverificatie vereist";
    case "unsupported_integration":
      return "Integratie niet ondersteund";
    case "sync_error":
      return "Syncfout";
    case "mismatch":
      return "Afwijking op platform";
    default:
      return status;
  }
}

export function formatDiscount(terms: OfferPayload["terms"]): string {
  if (terms.discount_type === "percentage") {
    return `${(terms.discount_value / 100).toLocaleString("nl-NL", { maximumFractionDigits: 2 })}%`;
  }
  return formatMinor(terms.discount_value);
}

export function formatOfferMoney(minor: number | null | undefined): string {
  if (minor == null) return "—";
  return formatMinor(minor);
}

export function formatAddedAt(iso: string): string {
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

export function assignedLabel(assigned: CodeAssigned): string {
  if (!assigned) return "—";
  if (assigned.consumer) return assigned.consumer;
  return assigned.voucher_id.slice(-8).toUpperCase();
}

export function summaryCounters(counters: CodeCounters | null) {
  if (!counters) {
    return { total: 0, available: 0, reservedIssued: 0, redeemedInvalid: 0 };
  }
  return {
    total: counters.total,
    available: counters.available,
    reservedIssued: counters.reserved + counters.issued,
    redeemedInvalid: counters.redeemed + counters.invalid + counters.expired + counters.cancelled,
  };
}

export function costPreviewLine(preview: CostPreview | null | undefined): string | null {
  if (!preview?.applies || !preview.available || !preview.per_voucher) return null;
  const { reward_minor, fee_minor, merchant_commitment_minor } = preview.per_voucher;
  return `${formatMinor(reward_minor)} beloning + ${formatMinor(fee_minor)} fee = ${formatMinor(merchant_commitment_minor)} merchant-commitment`;
}
