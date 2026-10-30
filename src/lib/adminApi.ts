import { apiRequest } from "@/lib/api";

export type PageMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}

/* ── Step-up ─────────────────────────────────────────────── */

export async function confirmPassword(password: string): Promise<void> {
  await apiRequest({ path: "/user/confirm-password", method: "POST", body: { password } });
}

export async function requestStepUpCode(): Promise<{ sent: boolean; expires_at: string }> {
  const res = await apiRequest<{ data: { sent: boolean; expires_at: string } }>({
    path: "/api/v1/admin/step-up/code",
    method: "POST",
  });
  return res.data;
}

export async function verifyStepUpCode(code: string): Promise<{ confirmed: boolean; valid_until: string }> {
  const res = await apiRequest<{ data: { confirmed: boolean; valid_until: string } }>({
    path: "/api/v1/admin/step-up/verify",
    method: "POST",
    body: { code },
  });
  return res.data;
}

/* ── Webshops ────────────────────────────────────────────── */

export type ApprovalChecklist = {
  business_identity: boolean;
  ownership_verified: boolean;
  company_information_confirmed: boolean;
  agreement_accepted: boolean;
  owner_account_active: boolean;
};

export type AdminWebshop = {
  id: string;
  name: string;
  platform?: string;
  status: string;
  status_reason?: string | null;
  ownership_verified?: boolean;
  ownership_method?: string | null;
  verified_domain?: string | null;
  website_domain?: string | null;
  owners?: Array<{ id: string; first_name: string; email: string }>;
  integration_status?: string;
  active_offers?: number;
  last_activity_at?: string | null;
  review_requested_at?: string | null;
  approved_at?: string | null;
  created_at?: string;
  approval_checklist?: ApprovalChecklist;
  business_profile?: Record<string, unknown> | null;
  verifications?: Array<{
    id?: string;
    status?: string;
    notes?: string | null;
    evidence_files?: Array<{ id: string; name: string; mime: string; size: number }>;
  }>;
  agreement_acceptances?: Array<{
    id: string;
    version: string;
    signatory_name: string;
    accepted_at: string;
  }>;
  review_flags?: string[];
};

export async function fetchAdminWebshops(filters: {
  status?: string;
  search?: string;
  per_page?: number;
  page?: number;
}): Promise<{ data: AdminWebshop[]; meta?: PageMeta }> {
  return apiRequest({ path: `/api/v1/admin/webshops${qs(filters)}` });
}

export async function fetchAdminWebshop(id: string): Promise<AdminWebshop> {
  const res = await apiRequest<{ data: AdminWebshop }>({ path: `/api/v1/admin/webshops/${id}` });
  return res.data;
}

export async function approveWebshop(id: string, reason: string, confirmDuplicate = false): Promise<AdminWebshop> {
  const res = await apiRequest<{ data: AdminWebshop }>({
    path: `/api/v1/admin/webshops/${id}/approve`,
    method: "POST",
    body: { reason, confirm_duplicate_claim: confirmDuplicate },
  });
  return res.data;
}

export async function rejectWebshop(id: string, reason: string): Promise<AdminWebshop> {
  const res = await apiRequest<{ data: AdminWebshop }>({
    path: `/api/v1/admin/webshops/${id}/reject`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function suspendWebshop(id: string, reason: string): Promise<AdminWebshop> {
  const res = await apiRequest<{ data: AdminWebshop }>({
    path: `/api/v1/admin/webshops/${id}/suspend`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function unsuspendWebshop(id: string, reason: string): Promise<AdminWebshop> {
  const res = await apiRequest<{ data: AdminWebshop }>({
    path: `/api/v1/admin/webshops/${id}/unsuspend`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function requestWebshopInformation(id: string, message: string): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/webshops/${id}/request-information`,
    method: "POST",
    body: { message },
  });
}

/* ── Users ───────────────────────────────────────────────── */

export type AdminUser = {
  id: string;
  first_name: string;
  email: string;
  status: string;
  roles?: string[];
  account_role?: string;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
  created_at?: string;
  last_login_at?: string | null;
  locale?: string;
  platform_roles?: Array<{
    role: string;
    granted_via: string;
    granted_at: string;
    revoked_at: string | null;
  }>;
  memberships?: Array<{
    webshop: { id: string; name: string; status: string };
    role: string;
    status: string;
    joined_at: string | null;
  }>;
  wallets?: Array<{
    id: string;
    unit: string;
    available: number;
    reserved: number;
    pending: number;
  }>;
  api_tokens?: number;
};

export async function fetchAdminUsers(filters: {
  search?: string;
  role?: string;
  status?: string;
  webshop_id?: string;
  registered_from?: string;
  registered_to?: string;
  per_page?: number;
}): Promise<{ data: AdminUser[]; meta?: PageMeta }> {
  return apiRequest({ path: `/api/v1/admin/users${qs(filters)}` });
}

export async function fetchAdminUser(id: string): Promise<AdminUser> {
  const res = await apiRequest<{ data: AdminUser }>({ path: `/api/v1/admin/users/${id}` });
  return res.data;
}

export async function suspendUser(id: string, reason: string): Promise<AdminUser> {
  const res = await apiRequest<{ data: AdminUser }>({
    path: `/api/v1/admin/users/${id}/suspend`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function reactivateUser(id: string, reason: string): Promise<AdminUser> {
  const res = await apiRequest<{ data: AdminUser }>({
    path: `/api/v1/admin/users/${id}/reactivate`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function resetUserSecurity(id: string, reason: string): Promise<AdminUser> {
  const res = await apiRequest<{ data: AdminUser }>({
    path: `/api/v1/admin/users/${id}/reset-security`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function revokeSuperAdmin(id: string, reason: string): Promise<AdminUser> {
  const res = await apiRequest<{ data: AdminUser }>({
    path: `/api/v1/admin/users/${id}/revoke-super-admin`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function revokeMembership(webshopId: string, userId: string, reason: string): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/webshops/${webshopId}/members/${userId}/revoke`,
    method: "POST",
    body: { reason },
  });
}

/* ── Support sessions ────────────────────────────────────── */

export type SupportSession = {
  id: string;
  status: string;
  admin: { id: string; first_name: string; email: string };
  target: { id: string; first_name: string; email: string };
  reason: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  ended_reason: string | null;
  token?: string;
  token_type?: string;
};

export async function startSupportSession(userId: string, reason: string): Promise<SupportSession> {
  const res = await apiRequest<{ data: SupportSession }>({
    path: "/api/v1/admin/support-sessions",
    method: "POST",
    body: { user_id: userId, reason },
  });
  return res.data;
}

export async function endSupportSessionAsAdmin(sessionId: string): Promise<SupportSession> {
  const res = await apiRequest<{ data: SupportSession }>({
    path: `/api/v1/admin/support-sessions/${sessionId}/end`,
    method: "POST",
  });
  return res.data;
}

export async function endCurrentSupportSession(): Promise<SupportSession> {
  const res = await apiRequest<{ data: SupportSession }>({
    path: "/api/v1/support-session",
    method: "DELETE",
  });
  return res.data;
}

/* ── Incidents ───────────────────────────────────────────── */

export type SecurityIncident = {
  id: string;
  category: string;
  severity: string;
  service: string;
  route: string;
  method: string;
  http_status: number;
  status: string;
  summary?: string;
  occurrences?: number;
  first_seen_at?: string;
  last_seen_at?: string;
  assigned_to?: string | null;
};

export async function fetchIncidents(filters: Record<string, string | number | undefined>): Promise<{
  data: SecurityIncident[];
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/incidents${qs(filters)}` });
}

export async function fetchIncident(id: string): Promise<{
  data: SecurityIncident;
  history: Array<Record<string, unknown>>;
  occurrences: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/incidents/${id}` });
}

export async function updateIncident(
  id: string,
  body: { status: string; assigned_to: string | null; reason: string }
): Promise<SecurityIncident> {
  const res = await apiRequest<{ data: SecurityIncident }>({
    path: `/api/v1/admin/incidents/${id}`,
    method: "PATCH",
    body,
  });
  return res.data;
}

export async function requestIncidentDiagnostic(incidentId: string, requestKey: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/incidents/${incidentId}/diagnostics`,
    method: "POST",
    body: { request_key: requestKey },
  });
  return res.data;
}

export async function fetchIncidentDiagnostics(incidentId: string): Promise<{
  data: Array<Record<string, unknown>>;
  availability?: { configured: boolean };
}> {
  return apiRequest({ path: `/api/v1/admin/incidents/${incidentId}/diagnostics` });
}

export async function reviewIncidentDiagnostic(
  diagnosticId: string,
  decision: "accepted" | "dismissed",
  note: string
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/incident-diagnostics/${diagnosticId}/review`,
    method: "POST",
    body: { decision, note },
  });
  return res.data;
}

/* ── Operations ──────────────────────────────────────────── */

export async function fetchIntegrations(perPage = 25): Promise<{ data: Array<Record<string, unknown>>; meta?: PageMeta }> {
  return apiRequest({ path: `/api/v1/admin/integrations${qs({ per_page: perPage })}` });
}

export async function fetchFailedIntegrationEvents(perPage = 25): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/integrations/failed-events${qs({ per_page: perPage })}` });
}

export async function retryIntegrationEvent(eventId: string, reason: string): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/integrations/events/${eventId}/retry`,
    method: "POST",
    body: { reason },
  });
}

export async function fetchAnswer24Overview(): Promise<{ data: Record<string, unknown>; definitions?: Record<string, string> }> {
  return apiRequest({ path: "/api/v1/admin/answer24" });
}

export async function retryAnswer24Message(messageId: string, reason: string): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/answer24/messages/${messageId}/retry`,
    method: "POST",
    body: { reason },
  });
}

/* ── Wallets / financial ─────────────────────────────────── */

export async function fetchWallets(filters: Record<string, string | number | undefined> = {}): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/wallets${qs(filters)}` });
}

export async function fetchWalletLedger(walletId: string): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/wallets/${walletId}/ledger` });
}

export async function fetchWalletAdjustments(status?: string): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/wallet-adjustments${qs({ status })}` });
}

export async function requestWalletAdjustment(body: {
  wallet_id: string;
  consumer_id: string;
  source_entry_id: string;
  amount: number;
  reason: string;
  verification_note: string;
  request_key: string;
}): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: "/api/v1/admin/wallet-adjustments",
    method: "POST",
    body,
  });
  return res.data;
}

export async function reviewWalletAdjustment(
  approvalId: string,
  decision: "approved" | "rejected",
  note: string
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/wallet-adjustments/${approvalId}/review`,
    method: "POST",
    body: { decision, note },
  });
  return res.data;
}

export async function fetchWalletFlags(status?: string): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/wallet-reconciliation-flags${qs({ status })}` });
}

export async function resolveWalletFlag(flagId: string, reason: string): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/wallet-reconciliation-flags/${flagId}/resolve`,
    method: "POST",
    body: { reason },
  });
}

export async function fetchFinancialOversight(): Promise<Record<string, unknown>> {
  return apiRequest({ path: "/api/v1/admin/financial-oversight" });
}

export async function fetchDisputes(filters: Record<string, string | number | undefined> = {}): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/disputes${qs(filters)}` });
}

export async function fetchDispute(id: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({ path: `/api/v1/admin/disputes/${id}` });
  return res.data;
}

export async function updateDisputeStatus(
  id: string,
  body: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/disputes/${id}/status`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function resolveDispute(
  id: string,
  body: {
    outcome: "resolved" | "rejected";
    compensation: "none" | "wallet_credit" | "replacement" | "refund";
    amount_minor?: number | null;
    note: string;
  }
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/disputes/${id}/resolve`,
    method: "POST",
    body,
  });
  return res.data;
}

/* ── Platform settings / audit / routes ──────────────────── */

export async function fetchPlatformSettings(key?: string): Promise<{
  data: Array<Record<string, unknown>>;
  published?: Record<string, unknown>;
  allowed_keys?: string[];
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/platform-settings${qs({ key })}` });
}

export async function createPlatformSettingDraft(body: {
  key: string;
  value: unknown;
  reason: string;
}): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: "/api/v1/admin/platform-settings",
    method: "POST",
    body,
  });
  return res.data;
}

export async function submitPlatformSetting(versionId: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/platform-settings/${versionId}/review`,
    method: "POST",
  });
  return res.data;
}

export async function publishPlatformSetting(versionId: string, note: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/platform-settings/${versionId}/publish`,
    method: "POST",
    body: { note },
  });
  return res.data;
}

export async function rollbackPlatformSetting(versionId: string, reason: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/platform-settings/${versionId}/rollback`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function exportAudit(from: string, to: string, perPage = 100): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
  integrity?: Record<string, unknown>;
}> {
  return apiRequest({
    path: "/api/v1/admin/audit/export",
    method: "POST",
    body: { from, to, per_page: perPage },
  });
}

export async function fetchApiRoutes(filters: Record<string, string | number | undefined> = {}): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
}> {
  return apiRequest({ path: `/api/v1/admin/api-routes${qs(filters)}` });
}

/* ── Affiliate (Super Admin) ─────────────────────────────── */

export async function fetchAffiliateConnections(): Promise<{ data: Array<Record<string, unknown>> }> {
  return apiRequest({ path: "/api/v1/admin/affiliate/connections" });
}

export async function fetchAffiliatePrograms(filters: Record<string, string | number | boolean | undefined> = {}): Promise<{
  data: Array<Record<string, unknown>>;
}> {
  const normalized: Record<string, string | number | undefined> = {};
  for (const [k, v] of Object.entries(filters)) {
    if (typeof v === "boolean") normalized[k] = v ? "1" : "0";
    else normalized[k] = v;
  }
  return apiRequest({ path: `/api/v1/admin/affiliate/programs${qs(normalized)}` });
}

export async function fetchAffiliateTransactions(filters: Record<string, string | number | undefined> = {}): Promise<{
  data: Array<Record<string, unknown>>;
  meta?: PageMeta;
  totals?: Record<string, { count: number; commission_minor: number }>;
}> {
  return apiRequest({ path: `/api/v1/admin/affiliate/transactions${qs(filters)}` });
}

export async function fetchAffiliateRewardRules(): Promise<{
  data: Array<Record<string, unknown>>;
  current?: number | null;
}> {
  return apiRequest({ path: "/api/v1/admin/affiliate/reward-rules" });
}

export async function testAffiliateConnection(id: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/affiliate/connections/${encodeURIComponent(id)}/test`,
    method: "POST",
  });
  return res.data;
}

export async function syncAffiliateConnection(id: string, async = true): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/affiliate/connections/${encodeURIComponent(id)}/sync`,
    method: "POST",
    body: { async },
  });
  return res.data;
}

export async function resolveAffiliateTransaction(
  id: string,
  body: { action: "link_click" | "accept" | "reject"; click_reference?: string; note: string }
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/affiliate/transactions/${encodeURIComponent(id)}/resolve`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function matchAffiliateProgram(
  programId: string,
  body: { webshop_id?: string | null; cashback_allowed?: boolean }
): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: `/api/v1/admin/affiliate/programs/${encodeURIComponent(programId)}`,
    method: "PATCH",
    body,
  });
  return res.data;
}

export async function createAffiliateRewardRule(body: {
  unit: string;
  share_bps: number;
  min_commission_minor?: number;
  review_above_minor?: number | null;
}): Promise<Record<string, unknown>> {
  const res = await apiRequest<{ data: Record<string, unknown> }>({
    path: "/api/v1/admin/affiliate/reward-rules",
    method: "POST",
    body,
  });
  return res.data;
}
