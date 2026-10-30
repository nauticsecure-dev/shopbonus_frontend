import { apiRequest } from "@/lib/api";
import { formatMinor } from "@/lib/money";

export type DashboardGreeting = "good_morning" | "good_afternoon" | "good_evening" | string;

export type MerchantKpis = {
  active_offers: number;
  available_codes: number;
  issued_vouchers: number;
  claimed_vouchers: number;
  redeemed_vouchers: number;
  scheduled_offers: number;
  paused_offers: number;
  open_disputes: number;
};

export type ConnectionHealth = {
  status: "healthy" | "attention" | "none" | "setup_required" | "disconnected" | string;
  total: number;
  connected: number;
  attention: number;
  last_error_at: string | null;
};

export type RecentActivityItem = {
  action: string;
  at: string;
  resource_type: string | null;
};

export type QuickAction = {
  key: string;
  available: boolean;
};

export type OffersMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

export type DashboardOffer = {
  id: string;
  name: string | null;
  summary: string | null;
  type: "percentage" | "fixed" | string | null;
  acquisition: string;
  min_order_minor: number | null;
  available_codes: number;
  issued: number;
  status: "active" | "draft" | "paused" | "expired" | "ended" | "scheduled" | "archived" | string;
  lifecycle_status?: "draft" | "scheduled" | "active" | "paused" | "sold_out" | "expired" | "archived" | string;
  attention: string[];
};

export type MerchantNotificationItem = {
  id: string;
  type: string;
  severity: string;
  title: string;
  body: string;
  subject: { type: string; id: string } | null;
  read: boolean;
  created_at: string;
};

export type MerchantDashboard = {
  webshop: { id: string; name: string; status: string };
  greeting: DashboardGreeting;
  kpis: MerchantKpis;
  connection_health: ConnectionHealth;
  recent_activity: RecentActivityItem[];
  quick_actions: QuickAction[];
  empty: boolean;
  definitions: Record<string, string>;
  offers: DashboardOffer[];
  offers_meta: OffersMeta;
  notifications: {
    unread: number;
    latest: MerchantNotificationItem[];
  };
  funding: { available_minor: number; reserved_minor: number };
  generated_at: string;
};

export type ClaimsSeries = {
  timezone: string;
  from: string;
  to: string;
  days: { date: string; claims: number; issued: number; redeemed: number }[];
  totals: { claims: number; issued: number; redeemed: number };
};

type Data<T> = { data: T };

function ws(path: string, workspaceId: string): string {
  return `/api/v1/workspaces/${workspaceId}${path}`;
}

export async function fetchMerchantDashboard(
  workspaceId: string,
  signal?: AbortSignal,
  params?: { status?: string }
): Promise<MerchantDashboard> {
  const q = new URLSearchParams();
  if (params?.status && params.status !== "all") q.set("status", params.status);
  const qs = q.toString();
  const res = await apiRequest<Data<MerchantDashboard>>({
    path: ws(`/dashboard${qs ? `?${qs}` : ""}`, workspaceId),
    signal,
  });
  return res.data;
}

export async function fetchClaimsSeries(
  workspaceId: string,
  days: 7 | 30 | 90,
  signal?: AbortSignal
): Promise<ClaimsSeries> {
  const res = await apiRequest<Data<ClaimsSeries>>({
    path: ws(`/analytics/claims?days=${days}`, workspaceId),
    signal,
  });
  return res.data;
}

export async function fetchMerchantNotifications(
  workspaceId: string,
  opts?: { unread?: boolean; signal?: AbortSignal }
): Promise<{ data: MerchantNotificationItem[]; meta: { unread: number; total: number; current_page: number; last_page: number } }> {
  const q = opts?.unread ? "?unread=1" : "";
  return apiRequest({
    path: ws(`/notifications${q}`, workspaceId),
    signal: opts?.signal,
  });
}

export async function markNotificationRead(
  workspaceId: string,
  notificationId: string
): Promise<MerchantNotificationItem> {
  const res = await apiRequest<Data<MerchantNotificationItem>>({
    path: ws(`/notifications/${notificationId}/read`, workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function markAllNotificationsRead(workspaceId: string): Promise<{ marked_read: number; unread: number }> {
  const res = await apiRequest<Data<{ marked_read: number; unread: number }>>({
    path: ws("/notifications/read-all", workspaceId),
    method: "POST",
  });
  return res.data;
}

export async function selectWorkspace(workspaceId: string): Promise<void> {
  await apiRequest({
    path: ws("/select", workspaceId),
    method: "POST",
  });
}

export function greetingLabel(greeting: DashboardGreeting): string {
  switch (greeting) {
    case "good_morning":
      return "Goedemorgen";
    case "good_afternoon":
      return "Goedemiddag";
    case "good_evening":
      return "Goedenavond";
    default:
      return "Hallo";
  }
}

export function offerStatusLabel(status: string): string {
  switch (status) {
    case "active":
      return "Actief";
    case "paused":
      return "Gepauzeerd";
    case "draft":
      return "Concept";
    case "scheduled":
      return "Gepland";
    case "sold_out":
      return "Uitverkocht";
    case "archived":
      return "Gearchiveerd";
    case "expired":
      return "Verlopen";
    case "ended":
      return "Beëindigd";
    default:
      return status;
  }
}

export function offerLifecycle(offer: { lifecycle_status?: string; status: string }): string {
  return offer.lifecycle_status || offer.status;
}

function normalizeActionKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function quickActionHref(key: string): string {
  switch (normalizeActionKey(key)) {
    case "create_offer":
      return "/dashboard/offers?new=1";
    case "import_codes":
      return "/dashboard/offers?inventory=upload";
    case "connect_store":
      return "/dashboard/webshops";
    case "top_up_funding":
      return "/dashboard/settings";
    case "review_vouchers":
      return "/dashboard/vouchers";
    case "manage_offers":
      return "/dashboard/offers";
    case "view_orders":
      return "/dashboard/orders";
    case "settings":
      return "/dashboard/settings";
    default:
      return "/dashboard";
  }
}

export function quickActionLabel(key: string): string {
  switch (normalizeActionKey(key)) {
    case "create_offer":
      return "Nieuwe aanbieding";
    case "import_codes":
      return "Codes uploaden";
    case "connect_store":
      return "Webshop koppelen";
    case "top_up_funding":
      return "Saldo opwaarderen";
    case "review_vouchers":
      return "Vouchers bekijken";
    case "manage_offers":
      return "Aanbiedingen beheren";
    case "view_orders":
      return "Orders bekijken";
    case "settings":
      return "Instellingen";
    default:
      return key;
  }
}

export function webshopAccountLabel(status: string): string {
  switch (status) {
    case "approved":
      return "Goedgekeurd";
    case "pending_review":
      return "In beoordeling";
    case "suspended":
      return "Opgeschort";
    case "rejected":
      return "Afgewezen";
    case "draft":
      return "Concept";
    default:
      return status;
  }
}

export function connectionHealthLabel(status: string): string {
  switch (status) {
    case "healthy":
      return "Gezond";
    case "attention":
      return "Aandacht nodig";
    case "none":
      return "Geen koppeling";
    case "setup_required":
      return "Instellen vereist";
    case "disconnected":
      return "Niet verbonden";
    default:
      return status;
  }
}

export function activityLabel(action: string): string {
  const known: Record<string, string> = {
    "vouchers.exported": "Vouchers geëxporteerd",
    "dispute.opened": "Geschil geopend",
    "voucher.redeem_unknown_code": "Onbekende code bij inwisselen",
    "offer.created": "Aanbieding aangemaakt",
    "offer.updated": "Aanbieding bijgewerkt",
    "offer.published": "Aanbieding gepubliceerd",
    "offer.paused": "Aanbieding gepauzeerd",
    "offer.resumed": "Aanbieding hervat",
    "offer.archived": "Aanbieding gearchiveerd",
    "offer.duplicated": "Aanbieding gedupliceerd",
    "codes.imported": "Codes geïmporteerd",
  };
  return known[action] ?? action.replace(/[._]/g, " ");
}

export function offerTypeLabel(type: string | null): string {
  if (type === "percentage") return "Percentage";
  if (type === "fixed") return "Vast bedrag";
  return type ?? "—";
}

export function formatMinOrder(minor: number | null): string {
  if (minor == null || minor <= 0) return "Geen minimum";
  return formatMinor(minor).replace(",00", "");
}

export function formatChartDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export function formatRelativeNl(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Vandaag om ${time}`;
  return `${date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })} om ${time}`;
}

/** Deep-link into Offers & Codes (or settings) for a merchant notification. */
export function notificationHref(notice: MerchantNotificationItem): string {
  const subjectId = notice.subject?.id;
  switch (notice.type) {
    case "low_inventory":
      return subjectId
        ? `/dashboard/offers?offer=${encodeURIComponent(subjectId)}&inventory=available`
        : "/dashboard/offers?inventory=available";
    case "offer_expiring":
      return subjectId ? `/dashboard/offers?offer=${encodeURIComponent(subjectId)}` : "/dashboard/offers";
    case "new_claims":
      return "/dashboard/offers?focus=claims";
    case "connector_error":
      return "/dashboard/webshops";
    case "low_funding":
      return "/dashboard/settings";
    default:
      return subjectId ? `/dashboard/offers?offer=${encodeURIComponent(subjectId)}` : "/dashboard/notifications";
  }
}

export function notificationTone(notice: MerchantNotificationItem): "warning" | "info" | "success" {
  if (notice.severity === "critical" || notice.severity === "warning" || notice.type === "low_inventory") {
    return "warning";
  }
  if (notice.type === "new_claims") return "success";
  return "info";
}

export function shopInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
