import { apiRequest, ApiError, ensureCsrfCookie } from "@/lib/api";
import type { Locale } from "@/types/locale";

export type OnboardingIntent = "consumer" | "merchant";
/** Primary account role from the server (`/me`). */
export type AccountRole = "consumer" | "merchant" | "super_admin";
export type Destination =
  | "verify_email"
  | "consumer_dashboard"
  | "webshop_setup"
  | "workspace"
  | "admin";

export interface MeWorkspace {
  id: string;
  name: string;
  status: string;
  role: string;
  is_current: boolean;
}

export interface MeUser {
  id: string;
  first_name: string;
  email: string;
  email_verified: boolean;
  status: string;
  /** consumer | merchant | super_admin — set at signup (except super_admin). */
  role?: AccountRole;
  onboarding_intent: OnboardingIntent;
  locale: string;
  /** Platform roles only (e.g. super_admin). */
  roles: string[];
  workspaces: MeWorkspace[];
  destination: Destination | string;
  two_factor_enabled: boolean;
  support_session: {
    id: string;
    admin: { first_name: string; email: string };
    reason: string;
    expires_at: string;
  } | null;
}

export interface MeResponse {
  data: MeUser;
}

export interface LegalDocumentMeta {
  version: string | null;
  source: string | null;
  document_url: string | null;
}

export interface LegalRequirements {
  locale: string;
  registration_available: boolean;
  documents_available: boolean;
  documents: {
    terms: LegalDocumentMeta;
    privacy: LegalDocumentMeta;
  };
}

export interface RegisterInput {
  account_type: OnboardingIntent;
  first_name: string;
  email: string;
  password: string;
  accept_terms: true;
  terms_version: string;
  privacy_version: string;
  marketing_opt_in?: boolean;
  locale?: Locale;
}

/**
 * UI role derived from server state — never treat as authorization.
 * Prefer the authoritative `role` from `/me`.
 */
export function deriveUiRole(user: MeUser): "consumer" | "merchant" | "super_admin" {
  if (user.role === "super_admin" || user.roles.includes("super_admin") || user.destination === "admin") {
    return "super_admin";
  }
  if (user.role === "merchant" || user.role === "consumer") {
    return user.role;
  }
  if (user.workspaces.length > 0) return "merchant";
  if (user.destination === "workspace" || user.destination === "webshop_setup") {
    return "merchant";
  }
  if (user.onboarding_intent === "merchant") return "merchant";
  return "consumer";
}

/** Same-origin relative paths only — blocks open redirects after login/activation. */
function safeInternalNext(next?: string | null): string | null {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return null;
  }
  // Allow public consumer destinations and merchant dashboard; reject protocol-relative / external.
  if (
    /^\/(?:dashboard|mijn-voordelen|profiel|webshops|aanbiedingen|afrekenen|checkout|claim|account|voor-webshops|onboarding|invitations|hoe-werkt-het|kortingscodes|pagina)(?:\/|$|\?)/.test(
      next
    ) ||
    next === "/"
  ) {
    return next;
  }
  return null;
}

function safeDashboardNext(next?: string | null): string | null {
  const safe = safeInternalNext(next);
  if (safe && /^\/dashboard(?:\/|$)/.test(safe)) return safe;
  return null;
}

/** True when the merchant already owns/belongs to at least one webshop. */
export function merchantHasShop(user: Pick<MeUser, "workspaces"> | null | undefined): boolean {
  return (user?.workspaces?.length ?? 0) > 0;
}

/**
 * True when the user has at least one commercially approved workspace.
 * Draft / pending shops do not unlock the merchant dashboard.
 */
export function hasApprovedWorkspace(user: Pick<MeUser, "workspaces"> | null | undefined): boolean {
  return (user?.workspaces ?? []).some((w) => w.status === "approved");
}

/**
 * Post-auth landing path.
 * Approved membership → `/dashboard`.
 * Membership without approval → compliance onboarding (`/onboarding`).
 * Merchant intent without a workspace → `/voor-webshops/aanmelden` (create shop).
 */
export function pathForDestination(
  destination: string,
  next?: string | null,
  user?: Pick<MeUser, "workspaces" | "roles" | "onboarding_intent"> | null
): string {
  const merchantNext = safeDashboardNext(next);
  const consumerNext = safeInternalNext(next);
  const onboardingNext =
    safeInternalNext(next) &&
    (/^\/(?:onboarding|voor-webshops)(?:\/|$|\?)/.test(next ?? "") ? safeInternalNext(next) : null);

  if (
    destination === "admin" ||
    user?.roles?.includes("super_admin") ||
    (user as MeUser | null | undefined)?.role === "super_admin"
  ) {
    return "/admin";
  }

  // Commercially approved shop → merchant dashboard.
  if (hasApprovedWorkspace(user)) {
    return merchantNext ?? "/dashboard";
  }

  // Draft / pending membership → finish ownership + agreement first.
  if (merchantHasShop(user)) {
    return onboardingNext ?? "/onboarding";
  }

  switch (destination) {
    case "verify_email":
      return consumerNext
        ? `/account?mode=login&next=${encodeURIComponent(consumerNext)}`
        : "/account?mode=login";
    case "webshop_setup":
      return "/voor-webshops/aanmelden";
    case "workspace":
      // Server says workspace even if client briefly missed the list.
      return hasApprovedWorkspace(user) ? merchantNext ?? "/dashboard" : "/onboarding";
    case "admin":
      return "/admin";
    case "consumer_dashboard":
    default:
      return consumerNext ?? "/mijn-voordelen";
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

export function passwordStrength(password: string): {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  hints: string[];
} {
  const hints: string[] = [];
  if (password.length < 10) hints.push("min10");
  if (!/[A-Za-z]/.test(password)) hints.push("letters");
  if (!/[0-9]/.test(password)) hints.push("numbers");
  let score = 0;
  if (password.length >= 10) score += 1;
  if (password.length >= 14) score += 1;
  if (/[A-Za-z]/.test(password) && /[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const labels = ["weak", "fair", "ok", "strong", "strong"] as const;
  return { score: score as 0 | 1 | 2 | 3 | 4, label: labels[score], hints };
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const body = error.body as {
      error?: { message?: string; fields?: Record<string, string[]> };
      message?: string;
      errors?: Record<string, string[]>;
    } | null;
    const fields = body?.error?.fields ?? body?.errors;
    if (fields) {
      const first = Object.values(fields).flat()[0];
      if (first) return first;
    }
    return body?.error?.message || body?.message || error.message || fallback;
  }
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export async function fetchLegalRequirements(locale: Locale): Promise<LegalRequirements> {
  const res = await apiRequest<{ data: LegalRequirements }>({
    path: `/api/v1/public/legal-requirements?locale=${locale}`,
    locale,
  });
  return res.data;
}

export async function fetchMe(locale?: Locale): Promise<MeUser | null> {
  try {
    const res = await apiRequest<MeResponse>({ path: "/api/v1/me", locale });
    return res.data;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return null;
    }
    throw error;
  }
}

export async function registerAccount(input: RegisterInput, locale: Locale): Promise<MeUser> {
  await ensureCsrfCookie();
  const res = await apiRequest<MeResponse>({
    path: "/register",
    method: "POST",
    locale,
    body: input,
  });
  return res.data;
}

export async function loginAccount(
  email: string,
  password: string,
  locale: Locale
): Promise<{ user?: MeUser; twoFactor?: true }> {
  await ensureCsrfCookie();
  const res = await apiRequest<MeResponse | { two_factor: true }>({
    path: "/login",
    method: "POST",
    locale,
    body: { email, password },
  });
  if (res && typeof res === "object" && "two_factor" in res && res.two_factor) {
    return { twoFactor: true };
  }
  return { user: (res as MeResponse).data };
}

export async function logoutAccount(locale?: Locale): Promise<void> {
  try {
    await ensureCsrfCookie();
    await apiRequest({ path: "/logout", method: "POST", locale });
  } catch (error) {
    // Already logged out / expired CSRF is fine. Other failures are swallowed by
    // callers after clearing local session so navigation is never blocked.
    if (error instanceof ApiError && (error.status === 401 || error.status === 419)) {
      return;
    }
    throw error;
  }
}

export async function verifyEmailCode(code: string, locale: Locale): Promise<MeUser> {
  const res = await apiRequest<MeResponse>({
    path: "/api/v1/auth/email/verify-code",
    method: "POST",
    locale,
    body: { code },
  });
  return res.data;
}

export async function resendEmailCode(locale: Locale): Promise<{ resend_available_in_seconds: number }> {
  const res = await apiRequest<{
    data: { sent: boolean; expires_at: string; resend_available_in_seconds: number };
  }>({
    path: "/api/v1/auth/email/resend-code",
    method: "POST",
    locale,
  });
  return res.data;
}

export async function forgotPassword(email: string, locale: Locale): Promise<string> {
  await ensureCsrfCookie();
  const res = await apiRequest<{ message: string }>({
    path: "/forgot-password",
    method: "POST",
    locale,
    body: { email },
  });
  return res.message;
}

export async function resetPassword(
  payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  },
  locale: Locale
): Promise<void> {
  await ensureCsrfCookie();
  await apiRequest({
    path: "/reset-password",
    method: "POST",
    locale,
    body: payload,
  });
}
