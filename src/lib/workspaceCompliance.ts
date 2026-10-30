import { apiRequest, apiUpload, ApiError } from "@/lib/api";

type Data<T> = { data: T };

function ws(path: string, workspaceId = "current"): string {
  return `/api/v1/workspaces/${workspaceId}${path}`;
}

/** Compliance step keys from OnboardingProgress (Trello #16). */
export type ComplianceStepKey = "business_details" | "ownership" | "agreement" | "activation";

export type ComplianceStep = {
  key: ComplianceStepKey | string;
  status: string;
};

export type PlaceSuggestion = {
  place_id: string;
  name: string;
  description: string;
};

export type PlaceDetails = {
  place_id: string;
  name: string | null;
  formatted_address: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  website_url: string | null;
  phone: string | null;
  category: string | null;
};

export type FullBusinessProfile = {
  legal_name: string | null;
  trading_name: string | null;
  website_url: string | null;
  website_domain: string | null;
  kvk_number: string | null;
  vat_number: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  main_contact_name: string | null;
  address_line: string | null;
  postal_code: string | null;
  city: string | null;
  country_code: string | null;
  preferred_language: string | null;
  google_place_id: string | null;
  business_category: string | null;
  source: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  missing_fields: string[];
  domain_locked: boolean;
};

export type OwnershipVerification = {
  id: string;
  method: "dns_txt" | "website_file" | "domain_email" | "manual_review" | string;
  status: string;
  domain: string | null;
  instructions: Record<string, unknown>;
  attempt_count: number;
  expires_at: string | null;
  verified_at: string | null;
  failure_reason: string | null;
  created_at: string;
};

export type MerchantAgreement = {
  title: string;
  version: string;
  locale: string;
  body: string;
  document_hash: string;
  published_at: string | null;
  status: string;
  latest_acceptance: {
    id: string;
    version: string;
    document_hash: string;
    signatory_name: string;
    accepted_at: string;
  } | null;
};

export type AgreementAcceptance = {
  id: string;
  version: string;
  document_hash: string;
  signatory_name: string;
  accepted_at: string;
  webshop_status: string;
};

export type TeamMember = {
  id: string;
  first_name: string;
  email: string;
  role: "owner" | "manager" | "employee" | string;
  permissions: string[];
  granted_permissions: string[];
  status: string;
  joined_at: string | null;
  last_activity_at: string | null;
};

export type TeamInvitation = {
  id: string;
  email: string;
  role: string;
  permissions: string[];
  status: string;
  expires_at: string;
  last_sent_at: string;
  resend_count: number;
  created_at: string;
};

export type InvitationPreview = {
  webshop: { name: string };
  role: string;
  invited_by: string;
  email_hint: string;
  expires_at: string;
};

export type AcceptedWorkspace = {
  id: string;
  name: string;
  status: string;
  role?: string;
};

const STEP_LABELS: Record<string, { nl: string; en: string }> = {
  business_details: { nl: "Bedrijfsgegevens", en: "Business details" },
  ownership: { nl: "Eigendomsverificatie", en: "Ownership verification" },
  agreement: { nl: "Merchant-overeenkomst", en: "Merchant agreement" },
  activation: { nl: "Activatie", en: "Activation" },
};

export function complianceStepLabel(key: string, locale: "nl" | "en" = "nl"): string {
  return STEP_LABELS[key]?.[locale] ?? key;
}

/** True when the merchant still needs the #16 compliance wizard (no approved shop yet). */
export function needsComplianceOnboarding(user: {
  workspaces: { status: string }[];
  onboarding_intent?: string;
  destination?: string;
} | null | undefined): boolean {
  if (!user) return false;
  if (user.workspaces.length === 0) {
    return user.onboarding_intent === "merchant" || user.destination === "webshop_setup";
  }
  return !user.workspaces.some((w) => w.status === "approved");
}

export function complianceResumePath(nextStep: string | null, webshopStatus: string): string {
  if (webshopStatus === "approved") return "/dashboard";
  if (webshopStatus === "rejected" || webshopStatus === "suspended") return "/onboarding";
  if (nextStep === "activation" || webshopStatus === "pending_review") return "/onboarding?step=activation";
  if (nextStep === "agreement") return "/onboarding?step=agreement";
  if (nextStep === "ownership") return "/onboarding?step=ownership";
  return "/onboarding?step=business_details";
}

export async function searchBusinesses(
  query: string,
  country = "NL",
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({ query, country });
  const res = await apiRequest<Data<PlaceSuggestion[]>>({
    path: `/api/v1/business-directory/search?${params}`,
    signal,
  });
  return res.data;
}

export async function fetchPlaceDetails(placeId: string, signal?: AbortSignal): Promise<PlaceDetails> {
  const res = await apiRequest<Data<PlaceDetails>>({
    path: `/api/v1/business-directory/places/${encodeURIComponent(placeId)}`,
    signal,
  });
  return res.data;
}

export async function fetchFullBusinessProfile(workspaceId = "current"): Promise<FullBusinessProfile> {
  const res = await apiRequest<Data<FullBusinessProfile>>({ path: ws("/business-profile", workspaceId) });
  return res.data;
}

export async function saveFullBusinessProfile(
  body: Record<string, unknown>,
  workspaceId = "current"
): Promise<FullBusinessProfile> {
  const res = await apiRequest<Data<FullBusinessProfile>>({
    path: ws("/business-profile", workspaceId),
    method: "PUT",
    body,
  });
  return res.data;
}

export async function listOwnershipVerifications(workspaceId = "current"): Promise<OwnershipVerification[]> {
  const res = await apiRequest<Data<OwnershipVerification[]> | { data: OwnershipVerification[] }>({
    path: ws("/ownership/verifications", workspaceId),
  });
  // Laravel Resource collections wrap as { data: [...] }
  const payload = res as Data<OwnershipVerification[]>;
  return Array.isArray(payload.data) ? payload.data : [];
}

export async function startOwnershipVerification(
  body: { method: "dns_txt" | "website_file" | "domain_email"; mailbox?: string },
  workspaceId = "current"
): Promise<OwnershipVerification> {
  const res = await apiRequest<Data<OwnershipVerification>>({
    path: ws("/ownership/verifications", workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function checkOwnershipVerification(
  verificationId: string,
  workspaceId = "current"
): Promise<OwnershipVerification> {
  const res = await apiRequest<Data<OwnershipVerification>>({
    path: ws(`/ownership/verifications/${verificationId}/check`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function confirmOwnershipEmailCode(
  verificationId: string,
  code: string,
  workspaceId = "current"
): Promise<OwnershipVerification> {
  const res = await apiRequest<Data<OwnershipVerification>>({
    path: ws(`/ownership/verifications/${verificationId}/confirm-code`, workspaceId),
    method: "POST",
    body: { code },
  });
  return res.data;
}

export async function submitOwnershipReview(
  notes: string,
  files: File[],
  workspaceId = "current"
): Promise<OwnershipVerification> {
  const form = new FormData();
  form.append("notes", notes);
  for (const file of files) {
    form.append("evidence[]", file);
  }
  const res = await apiUpload<Data<OwnershipVerification>>({
    path: ws("/ownership/review", workspaceId),
    formData: form,
  });
  return res.data;
}

export async function fetchMerchantAgreement(workspaceId = "current"): Promise<MerchantAgreement> {
  const res = await apiRequest<Data<MerchantAgreement>>({ path: ws("/agreement", workspaceId) });
  return res.data;
}

export async function acceptMerchantAgreement(
  body: {
    accept: true;
    confirm_identity: true;
    signatory_name: string;
    version: string;
    document_hash: string;
  },
  workspaceId = "current"
): Promise<AgreementAcceptance> {
  const res = await apiRequest<Data<AgreementAcceptance>>({
    path: ws("/agreement/accept", workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function listTeamMembers(workspaceId = "current"): Promise<TeamMember[]> {
  const res = await apiRequest<Data<TeamMember[]>>({ path: ws("/members", workspaceId) });
  return res.data;
}

export async function listTeamInvitations(workspaceId = "current"): Promise<TeamInvitation[]> {
  const res = await apiRequest<Data<TeamInvitation[]>>({ path: ws("/invitations", workspaceId) });
  return res.data;
}

export async function createTeamInvitation(
  body: { email: string; role: "manager" | "employee"; permissions?: string[] },
  workspaceId = "current"
): Promise<TeamInvitation> {
  const res = await apiRequest<Data<TeamInvitation>>({
    path: ws("/invitations", workspaceId),
    method: "POST",
    body,
  });
  return res.data;
}

export async function resendTeamInvitation(invitationId: string, workspaceId = "current"): Promise<TeamInvitation> {
  const res = await apiRequest<Data<TeamInvitation>>({
    path: ws(`/invitations/${invitationId}/resend`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function cancelTeamInvitation(invitationId: string, workspaceId = "current"): Promise<TeamInvitation> {
  const res = await apiRequest<Data<TeamInvitation>>({
    path: ws(`/invitations/${invitationId}`, workspaceId),
    method: "DELETE",
  });
  return res.data;
}

export async function updateTeamMember(
  memberId: string,
  body: { role?: string; permissions?: string[] },
  workspaceId = "current"
): Promise<TeamMember> {
  const res = await apiRequest<Data<TeamMember>>({
    path: ws(`/members/${memberId}`, workspaceId),
    method: "PATCH",
    body,
  });
  return res.data;
}

export async function suspendTeamMember(memberId: string, workspaceId = "current"): Promise<TeamMember> {
  const res = await apiRequest<Data<TeamMember>>({
    path: ws(`/members/${memberId}/suspend`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function removeTeamMember(memberId: string, workspaceId = "current"): Promise<void> {
  await apiRequest({
    path: ws(`/members/${memberId}`, workspaceId),
    method: "DELETE",
  });
}

export async function previewInvitation(token: string): Promise<InvitationPreview> {
  const res = await apiRequest<Data<InvitationPreview>>({
    path: "/api/v1/invitations/preview",
    method: "POST",
    body: { token },
  });
  return res.data;
}

export async function acceptInvitation(token: string): Promise<AcceptedWorkspace> {
  const res = await apiRequest<Data<AcceptedWorkspace>>({
    path: "/api/v1/invitations/accept",
    method: "POST",
    body: { token },
  });
  return res.data;
}

export { ApiError };
