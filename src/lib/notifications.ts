import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";

export type NotificationFilter = "all" | "unread";
export type RecipientType = "consumer" | "workspace" | "admin";

export type CentralNotification = {
  id: string;
  type: string;
  recipient_type: RecipientType;
  title: string;
  body: string;
  locale?: string;
  action_label?: string;
  action_route?: string;
  workspace_id?: string | null;
  template_version?: string | null;
  locale_fallback?: boolean;
  delivery_channels?: { database?: string; email?: string };
  read_at: string | null;
  created_at: string;
};

export type NotificationsMeta = {
  unread_count: number;
  current_page: number;
  per_page: number;
  total: number;
};

export type NotificationPreferences = {
  locale: Locale | string;
  email_enabled: boolean;
  preferences: Record<string, { in_app: boolean; email: boolean }>;
  email_delivery_available: boolean;
};

export type NotificationTone = "warning" | "info" | "success" | "critical";

type Data<T> = { data: T };

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const out = search.toString();
  return out ? `?${out}` : "";
}

/** Map server-owned action routes onto Next.js pages. */
export function resolveNotificationHref(route: string | undefined | null, type?: string): string {
  if (!route) {
    if (type?.startsWith("workspace_") || type === "offer_published" || type === "offer_expiring" || type === "commission_changed" || type === "integration_attention" || type === "merchant_attention") {
      return "/dashboard";
    }
    if (type?.includes("admin") || type === "workspace_review_required" || type === "ai_support_escalated" || type === "affiliate_import_failed" || type?.includes("notification_")) {
      return "/app/platform/notifications";
    }
    return "/mijn-voordelen";
  }

  if (route.startsWith("/app/benefits")) return route.replace("/app/benefits", "/mijn-voordelen");
  if (route.startsWith("/app/platform")) return "/app/platform/notifications";
  if (route.startsWith("/app/workspaces")) {
    const url = new URL(route, "https://shopbonus.local");
    const workspace = url.searchParams.get("workspace");
    return workspace ? `/dashboard?workspace=${encodeURIComponent(workspace)}` : "/dashboard";
  }
  if (route.startsWith("/app/support")) return route;
  if (route.startsWith("/")) return route;
  return "/mijn-voordelen";
}

export function notificationTone(type: string): NotificationTone {
  if (
    type.includes("failed") ||
    type.includes("critical") ||
    type.includes("cancelled") ||
    type.includes("rejected") ||
    type === "integration_attention"
  ) {
    return type.includes("critical") || type.includes("failed") ? "critical" : "warning";
  }
  if (
    type.includes("credited") ||
    type.includes("received") ||
    type.includes("approved") ||
    type.includes("published") ||
    type === "email_verified" ||
    type === "voucher_used"
  ) {
    return "success";
  }
  return "info";
}

export function notificationIcon(type: string): "alert" | "check" | "bell" | "wallet" | "ticket" | "chat" | "store" {
  const tone = notificationTone(type);
  if (tone === "critical" || tone === "warning") return "alert";
  if (type.includes("cashback") || type.includes("wallet")) return "wallet";
  if (type.includes("voucher") || type.includes("offer")) return "ticket";
  if (type.includes("support")) return "chat";
  if (type.includes("workspace") || type.includes("integration") || type.includes("merchant")) return "store";
  if (tone === "success") return "check";
  return "bell";
}

export function formatRelativeTime(iso: string, locale: Locale | string = "nl"): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale === "en" ? "en" : "nl", { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 604800) return rtf.format(Math.round(diffSec / 86400), "day");
  return date.toLocaleDateString(locale === "en" ? "en-GB" : "nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function fetchNotifications(opts?: {
  filter?: NotificationFilter;
  page?: number;
  per_page?: number;
  signal?: AbortSignal;
  locale?: Locale;
}): Promise<{ data: CentralNotification[]; meta: NotificationsMeta }> {
  return apiRequest({
    path: `/api/v1/notifications${qs({
      filter: opts?.filter ?? "all",
      page: opts?.page ?? 1,
      per_page: opts?.per_page ?? 20,
    })}`,
    signal: opts?.signal,
    locale: opts?.locale,
  });
}

export async function markNotificationRead(
  id: string,
  locale?: Locale
): Promise<CentralNotification> {
  const res = await apiRequest<Data<CentralNotification>>({
    path: `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    method: "PATCH",
    locale,
  });
  return res.data;
}

export async function markAllNotificationsRead(locale?: Locale): Promise<{ marked_read: number }> {
  const res = await apiRequest<Data<{ marked_read: number }>>({
    path: "/api/v1/notifications/read-all",
    method: "POST",
    locale,
  });
  return res.data;
}

export async function fetchNotificationPreferences(locale?: Locale): Promise<NotificationPreferences> {
  const res = await apiRequest<Data<NotificationPreferences>>({
    path: "/api/v1/notification-preferences",
    locale,
  });
  return res.data;
}

export async function updateNotificationPreferences(
  body: {
    locale?: Locale;
    email_enabled?: boolean;
    preferences?: Record<string, { in_app?: boolean; email?: boolean }>;
  },
  locale?: Locale
): Promise<NotificationPreferences> {
  const res = await apiRequest<Data<NotificationPreferences>>({
    path: "/api/v1/notification-preferences",
    method: "PUT",
    locale,
    body,
  });
  return res.data;
}

/* ── Super Admin platform APIs ─────────────────────────── */

export type PlatformTemplate = {
  id: string;
  key: string;
  version: number;
  status: string;
  value: { title?: string; body?: string; action_label?: string };
  checksum: string;
  is_current: boolean;
  published_at: string | null;
  rollback_of: string | null;
};

export type PlatformEventDef = {
  event_type: string;
  audience: string;
  mandatory_in_app: boolean;
  mandatory_email: boolean;
  allowed_variables: string[];
  locales: string[];
  reminder_days: number[];
};

export type PlatformDelivery = {
  id: string;
  notification_id: string;
  channel: string;
  status: string;
  attempts: number;
  error_code: string | null;
  sent_at: string | null;
};

export type PlatformNotificationSettings = {
  voucher_reminder_days?: number[];
  offer_expiry_days?: number;
  retention_days?: number;
  email_enabled?: boolean;
  [key: string]: unknown;
};

export async function fetchPlatformTemplates(opts?: {
  page?: number;
  per_page?: number;
}): Promise<{ data: PlatformTemplate[]; meta: { current_page: number; total: number } }> {
  return apiRequest({
    path: `/api/v1/platform/notifications/templates${qs(opts ?? {})}`,
  });
}

export async function fetchPlatformTemplate(id: string): Promise<PlatformTemplate> {
  const res = await apiRequest<Data<PlatformTemplate>>({
    path: `/api/v1/platform/notifications/templates/${encodeURIComponent(id)}`,
  });
  return res.data;
}

export async function generatePlatformTemplates(
  eventType: string,
  idempotencyKey: string
): Promise<PlatformTemplate[]> {
  const res = await apiRequest<Data<PlatformTemplate[]>>({
    path: "/api/v1/platform/notifications/templates/generate",
    method: "POST",
    body: { event_type: eventType },
    headers: { "Idempotency-Key": idempotencyKey },
  });
  return res.data;
}

export async function createPlatformTemplate(input: {
  event_type: string;
  locale: Locale;
  value: { title: string; body: string; action_label: string };
  reason: string;
}): Promise<PlatformTemplate> {
  const res = await apiRequest<Data<PlatformTemplate>>({
    path: "/api/v1/platform/notifications/templates",
    method: "POST",
    body: input,
  });
  return res.data;
}

export async function updatePlatformTemplate(
  id: string,
  input: { value: Record<string, string>; expected_checksum: string; reason: string }
): Promise<PlatformTemplate> {
  const res = await apiRequest<Data<PlatformTemplate>>({
    path: `/api/v1/platform/notifications/templates/${encodeURIComponent(id)}`,
    method: "PUT",
    body: input,
  });
  return res.data;
}

export async function testPlatformTemplate(id: string): Promise<Record<string, unknown>> {
  const res = await apiRequest<Data<Record<string, unknown>>>({
    path: `/api/v1/platform/notifications/templates/${encodeURIComponent(id)}/test`,
    method: "POST",
  });
  return res.data;
}

export async function publishPlatformTemplate(id: string, note: string): Promise<PlatformTemplate> {
  const res = await apiRequest<Data<PlatformTemplate>>({
    path: `/api/v1/platform/notifications/templates/${encodeURIComponent(id)}/publish`,
    method: "POST",
    body: { note },
  });
  return res.data;
}

export async function rollbackPlatformTemplate(id: string, reason: string): Promise<PlatformTemplate> {
  const res = await apiRequest<Data<PlatformTemplate>>({
    path: `/api/v1/platform/notifications/templates/${encodeURIComponent(id)}/rollback`,
    method: "POST",
    body: { reason },
  });
  return res.data;
}

export async function fetchPlatformEvents(): Promise<{
  data: PlatformEventDef[];
  failures: Array<{ id: string; event_type: string; attempts: number; error_code: string | null }>;
}> {
  return apiRequest({ path: "/api/v1/platform/notifications/events" });
}

export async function retryPlatformEvent(id: string, note: string): Promise<{ id: string; status: string }> {
  const res = await apiRequest<Data<{ id: string; status: string }>>({
    path: `/api/v1/platform/notifications/events/${encodeURIComponent(id)}/retry`,
    method: "POST",
    body: { note },
  });
  return res.data;
}

export async function fetchPlatformDeliveries(opts?: {
  page?: number;
  per_page?: number;
  status?: string;
}): Promise<{
  data: PlatformDelivery[];
  meta: { current_page: number; total: number };
  operations: { failed_events: number; locale_fallbacks: number };
}> {
  return apiRequest({
    path: `/api/v1/platform/notifications/deliveries${qs(opts ?? {})}`,
  });
}

export async function retryPlatformDelivery(
  id: string,
  note: string,
  duplicateRiskAcknowledged = false
): Promise<PlatformDelivery> {
  const res = await apiRequest<Data<PlatformDelivery>>({
    path: `/api/v1/platform/notifications/deliveries/${encodeURIComponent(id)}/retry`,
    method: "POST",
    body: { note, duplicate_risk_acknowledged: duplicateRiskAcknowledged },
  });
  return res.data;
}

export async function resolvePlatformDelivery(
  id: string,
  note: string,
  outcome: "confirmed_sent" | "do_not_resend"
): Promise<PlatformDelivery> {
  const res = await apiRequest<Data<PlatformDelivery>>({
    path: `/api/v1/platform/notifications/deliveries/${encodeURIComponent(id)}/resolve`,
    method: "POST",
    body: { note, outcome },
  });
  return res.data;
}

export async function fetchPlatformNotificationSettings(): Promise<{
  data: PlatformNotificationSettings;
  email_delivery_available: boolean;
}> {
  return apiRequest({ path: "/api/v1/platform/notifications/settings" });
}

export async function updatePlatformNotificationSettings(
  value: PlatformNotificationSettings,
  reason: string
): Promise<{ data: { id: string; status: string; value: PlatformNotificationSettings } }> {
  return apiRequest({
    path: "/api/v1/platform/notifications/settings",
    method: "PUT",
    body: { value, reason },
  });
}
