import { apiRequest, apiUpload, ApiError } from "@/lib/api";
import { majorToMinor } from "@/lib/money";

export type RegistrationStepKey = "details" | "voucher_setup" | "activate";

export type RegistrationStep = {
  key: RegistrationStepKey;
  status: string;
  label: { nl: string; en: string };
};

export type ActivationBlocker = {
  code: string;
  message: string;
  missing_fields?: string[];
  required_minor?: number;
};

export type BranchDefaults = {
  category: string | null;
  suggestion: {
    discount_type: string;
    discount_value: number;
    min_order_minor: number;
    max_discount_minor: number;
    claim_validity_days: number;
    redemption_validity_days: number;
    note: string;
  };
  rationale: string;
};

export type OfferPreview = {
  published: boolean;
  how_to_obtain: string;
  title: string | null;
  summary: string | null;
  badge_label: string;
  offer_line: string;
  journey: {
    headline: string;
    steps: string[];
    claim_window: string | null;
    redemption_window: string | null;
    campaign: string | null;
  };
  discount_type: string | null;
  discount_value: number | null;
  currency: string;
  min_order_minor: number | null;
  max_discount_minor: number | null;
  claim_validity_days: number | null;
  redemption_validity_days: number | null;
  conditions: string | null;
  combinable: boolean;
  categories: { key: string; label: { nl: string; en: string } }[];
  webshop: {
    name: string;
    short_description: string | null;
    description: string | null;
    logo_url: string | null;
    cover_url: string | null;
    website_url: string | null;
    verified_domain: string | null;
    ownership_verified: boolean;
  };
};

export type CostPreview = {
  applies: boolean;
  available?: boolean;
  basis?: string;
  estimated_maximum?: boolean;
  fee_rate_bps?: number;
  per_voucher?: {
    reward_minor: number;
    fee_minor: number;
    merchant_commitment_minor: number;
  };
  note?: string;
  reason?: string;
};

export type OfferInventory = {
  total: number;
  available: number;
  reserved: number;
  issued: number;
  redeemed: number;
};

export type OfferPayload = {
  id: string;
  acquisition: string;
  status: string;
  /** Display lifecycle from the API: draft, scheduled, active, paused, sold_out, expired, archived. */
  lifecycle_status?: string;
  inventory?: OfferInventory;
  allowed_actions?: string[];
  activated_at?: string | null;
  paused_at?: string | null;
  ended_at?: string | null;
  archived_at?: string | null;
  terms: {
    version?: number;
    locked?: boolean;
    name: string;
    public_description: string | null;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    min_order_minor: number | null;
    max_discount_minor: number | null;
    claim_validity_days: number | null;
    redemption_validity_days: number | null;
    combinable: boolean;
    summary: string;
    categories?: string[];
    products?: string[];
    code_mode?: string | null;
    allocation_limit?: number | null;
  };
  missing_for_activation: string[];
  cost_preview: CostPreview;
  preview: OfferPreview | null;
};

export type CodeImportBatch = {
  id: string;
  status: string;
  source: string;
  totals: {
    submitted: number;
    valid: number;
    invalid: number;
    duplicate_in_upload: number;
    duplicate_existing: number;
    imported?: number;
  };
  rejections: { line: number; code: string; reason: string }[];
};

export type PublicProfile = {
  display_name: string;
  short_description: string | null;
  description: string | null;
  website_url: string | null;
  categories: string[];
  logo_url?: string | null;
  cover_url?: string | null;
  published?: boolean;
  slug?: string | null;
};

export type BusinessProfile = {
  legal_name?: string | null;
  trading_name: string | null;
  website_url: string | null;
  website_domain: string | null;
  kvk_number?: string | null;
  vat_number?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  main_contact_name?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country_code?: string | null;
  preferred_language?: string | null;
  google_place_id?: string | null;
  business_category: string | null;
  source?: string | null;
  confirmed: boolean;
  confirmed_at?: string | null;
  domain_locked: boolean;
  missing_fields: string[];
};

export type OnboardingData = {
  steps: { key: string; status: string }[];
  next_step: string | null;
  webshop_status: string;
  registration: {
    steps: RegistrationStep[];
    current_step: RegistrationStepKey;
    first_offer_id: string | null;
    available_codes: number;
    activation_blockers: ActivationBlocker[];
    branch_defaults: BranchDefaults;
    preview: OfferPreview | null;
    webshop_status: string;
  };
};

type Data<T> = { data: T };

function ws(path: string, workspaceId = "current"): string {
  return `/api/v1/workspaces/${workspaceId}${path}`;
}

export type CreatedWorkspace = {
  id: string;
  name: string;
  platform: string | null;
  status: string;
};

/** Creates the merchant's draft webshop (step 1 of onboarding). */
export async function createWorkspace(body: {
  name: string;
  platform?: string | null;
}): Promise<CreatedWorkspace> {
  const res = await apiRequest<Data<CreatedWorkspace>>({
    path: "/api/v1/workspaces",
    method: "POST",
    body,
  });
  return res.data;
}

export async function fetchOnboarding(workspaceId = "current", signal?: AbortSignal): Promise<OnboardingData> {
  const res = await apiRequest<Data<OnboardingData>>({ path: ws("/onboarding", workspaceId), signal });
  return res.data;
}

export async function fetchBusinessProfile(workspaceId = "current"): Promise<BusinessProfile> {
  const res = await apiRequest<Data<BusinessProfile>>({ path: ws("/business-profile", workspaceId) });
  return res.data;
}

export async function saveBusinessProfile(
  body: Record<string, unknown>,
  workspaceId = "current"
): Promise<BusinessProfile> {
  const res = await apiRequest<Data<BusinessProfile>>({
    path: ws("/business-profile", workspaceId),
    method: "PUT",
    body,
  });
  return res.data;
}

export async function fetchPublicProfile(workspaceId = "current"): Promise<PublicProfile> {
  const res = await apiRequest<Data<PublicProfile>>({ path: ws("/public-profile", workspaceId) });
  return res.data;
}

export async function savePublicProfile(
  body: Partial<PublicProfile> & { categories?: string[] },
  workspaceId = "current"
): Promise<PublicProfile> {
  const res = await apiRequest<Data<PublicProfile>>({
    path: ws("/public-profile", workspaceId),
    method: "PUT",
    body,
  });
  return res.data;
}

export async function listOffers(workspaceId = "current"): Promise<OfferPayload[]> {
  const res = await apiRequest<Data<OfferPayload[]>>({ path: ws("/offers", workspaceId) });
  return res.data;
}

export async function fetchOffer(offerId: string, workspaceId = "current"): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({ path: ws(`/offers/${offerId}`, workspaceId) });
  return res.data;
}

export async function createOffer(
  body: Record<string, unknown>,
  workspaceId = "current"
): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws("/offers", workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function updateOffer(
  offerId: string,
  body: Record<string, unknown>,
  workspaceId = "current"
): Promise<OfferPayload> {
  const res = await apiRequest<Data<OfferPayload>>({
    path: ws(`/offers/${offerId}`, workspaceId),
    method: "PATCH",
    body,
  });
  return res.data;
}

export async function previewCodeImport(
  offerId: string,
  codes: string,
  workspaceId = "current"
): Promise<CodeImportBatch> {
  const res = await apiRequest<Data<CodeImportBatch>>({
    path: ws(`/offers/${offerId}/code-imports`, workspaceId),
    method: "POST",
    body: { codes },
  });
  return res.data;
}

export async function uploadCodeImport(
  offerId: string,
  file: File,
  workspaceId = "current"
): Promise<CodeImportBatch> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiUpload<Data<CodeImportBatch>>({
    path: ws(`/offers/${offerId}/code-imports`, workspaceId),
    formData: form,
  });
  return res.data;
}

export async function commitCodeImport(batchId: string, workspaceId = "current"): Promise<CodeImportBatch> {
  const res = await apiRequest<Data<CodeImportBatch>>({
    path: ws(`/code-imports/${batchId}/commit`, workspaceId),
    method: "POST",
  });
  return res.data;
}

/** Build API offer body from merchant-facing form euros / percent. */
export function offerBodyFromForm(form: {
  name: string;
  discountType: "percentage" | "fixed";
  discount: string;
  minOrder: string;
  maxDiscount: string;
  claimDays: string;
  redemptionDays: string;
  terms: string;
  combinable?: boolean;
}): Record<string, unknown> {
  const discountNum = Math.max(0, Number(form.discount) || 0);
  const body: Record<string, unknown> = {
    name: form.name,
    public_description: form.terms.slice(0, 500),
    discount_type: form.discountType,
    discount_value:
      form.discountType === "percentage" ? Math.round(discountNum * 100) : majorToMinor(discountNum),
    min_order_minor: majorToMinor(Number(form.minOrder) || 0),
    claim_validity_days: Number(form.claimDays) || 90,
    redemption_validity_days: Number(form.redemptionDays) || 90,
    combinable: form.combinable ?? false,
  };
  if (form.discountType === "percentage") {
    body.max_discount_minor = majorToMinor(Number(form.maxDiscount) || 0) || null;
  } else {
    body.max_discount_minor = null;
  }
  return body;
}

export function formatEuroMinor(minor: number): string {
  return `€${(minor / 100).toLocaleString("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export { ApiError };
