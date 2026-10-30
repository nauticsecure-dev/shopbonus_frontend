import { apiRequest, ApiError } from "@/lib/api";
import type { MeWorkspace } from "@/lib/auth";

export { ApiError };

type Data<T> = { data: T };

export type PlatformCapabilityState = "AVAILABLE" | "LIMITED" | "UNSUPPORTED";

export type PlatformCapability = {
  state: PlatformCapabilityState;
  reason?: string | null;
  last_verified_at?: string | null;
};

export type PlatformCatalogueItem = {
  platform: string;
  name: string;
  priority: string | null;
  available: boolean;
  method: string | null;
  auth: string | null;
  reliability: string | null;
  limitations: string[];
  verification: string;
  profile: Record<string, unknown> | null;
  blocked_reason: string | null;
  capabilities?: Record<string, PlatformCapability>;
  category?: "webshop" | "coming_soon";
};

export type ConnectionStatus =
  | "setup_required"
  | "awaiting_test"
  | "testing"
  | "connected"
  | "limited"
  | "error"
  | "disconnected";

export type ConnectionSetup = {
  format?: string;
  webhook_url?: string;
  steps?: string[];
  read_api_configured?: boolean;
  read_api_notice?: string;
  [key: string]: unknown;
};

export type WebshopConnection = {
  id: string;
  platform: string;
  method: string;
  status: ConnectionStatus | string;
  external_shop_ref: string | null;
  limitations: string[];
  last_event_at: string | null;
  last_verified_order_at: string | null;
  connected_at: string | null;
  disconnected_at: string | null;
  last_error: { code: string; at: string | null } | null;
  created_at: string;
  setup?: ConnectionSetup;
  secrets?: Record<string, string>;
  secrets_notice?: string;
};

export type ConnectionChecklist = {
  status: string;
  quality_gates: Record<string, boolean>;
  missing_gates: string[];
  checks: Record<string, boolean>;
  missing_fields: string[];
  limitations: string[];
  next_action: string | null;
};

export type OrderSheetRow = {
  id: string;
  reference: string | null;
  external_order_id: string;
  platform: string;
  customer: { first_name: string | null; email: string | null; phone: string | null };
  amount_minor: number | null;
  refunded_minor: number | null;
  currency: string | null;
  payment_status: string;
  provider_status: string | null;
  ingestion_status: string;
  missing_fields: string[];
  callable: boolean;
  eligibility_status: string | null;
  contact_status: string | null;
  placed_at: string | null;
  paid_at: string | null;
  updated_at: string | null;
};

export type OrdersPage = {
  data: OrderSheetRow[];
  meta: {
    today?: { count?: number; amount_minor?: number; currency?: string };
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
};

export type ConnectionHealth = {
  status: string;
  capabilities: Record<string, PlatformCapability>;
  sync: {
    healthy: boolean;
    last_success_at: string | null;
    lag_seconds: number | null;
    error: string | null;
  };
  products_synced: number;
  coupons_synced: number;
  eligible_coupons: number;
};

export type WebhookEventRow = {
  id: string;
  topic: string;
  status: string;
  delivery_count: number;
  result: string | null;
  error_code: string | null;
  received_at: string;
  processed_at: string | null;
};

export type CatalogProductRow = {
  id: string;
  external_product_id: string;
  sku: string | null;
  name: string | null;
  price_minor: number | null;
  currency: string | null;
  availability: string | null;
  synced_at: string;
};

export type CatalogCouponRow = {
  id: string;
  external_coupon_id: string;
  code: string | null;
  discount_type: string | null;
  discount_value: string | number | null;
  status: string | null;
  eligible_public: boolean;
  synced_at: string;
};

export type ShopifyOAuthStart = {
  connection: string;
  authorization_url: string;
  expires_in: number;
};

/** Merchant-facing capability badge — never invents VERIFIED without server evidence. */
export type CapabilityBadgeKind =
  | "VERIFIED"
  | "LIMITED"
  | "SETUP REQUIRED"
  | "BLOCKED"
  | "UNSUPPORTED"
  | "DISCONNECTED"
  | "ERROR"
  | "COMING SOON";

const COMING_SOON = new Set(["lightspeed_e", "squarespace", "mijnwebwinkel", "ccv"]);

export function platformCategory(platform: string, available?: boolean): "webshop" | "coming_soon" {
  if (COMING_SOON.has(platform) || available === false) return "coming_soon";
  return "webshop";
}

/** Employees have no integrations.* by default; sales agents have no App Store access. */
export function canAccessAppStore(workspace: Pick<MeWorkspace, "role"> | null | undefined): boolean {
  if (!workspace?.role) return false;
  return workspace.role === "owner" || workspace.role === "manager";
}

export function canManageIntegrations(workspace: Pick<MeWorkspace, "role"> | null | undefined): boolean {
  return canAccessAppStore(workspace);
}

/** Merchant-facing lifecycle label; never upgrades to CONNECTED without server status. */
export function connectionLifecycle(
  connection: WebshopConnection | null | undefined,
  checklist?: ConnectionChecklist | null
): string {
  if (!connection) return "not_connected";
  const status = connection.status;
  if (status === "setup_required") {
    const awaiting =
      checklist?.next_action === "place_test_order" ||
      checklist?.next_action === "configure_webhook" ||
      Boolean(connection.setup?.webhook_url);
    return awaiting ? "awaiting_test" : "setup_required";
  }
  return status;
}

export function connectionStatusLabel(status: string): string {
  const map: Record<string, string> = {
    not_connected: "Niet verbonden",
    setup_required: "Setup vereist",
    awaiting_test: "Wacht op testorder",
    testing: "Bezig met testen",
    connected: "Verbonden",
    limited: "Beperkt",
    error: "Fout",
    disconnected: "Verbroken",
  };
  return map[status] ?? status;
}

export function connectionBadge(
  platform: PlatformCatalogueItem | null | undefined,
  connection: WebshopConnection | null | undefined,
  checklist?: ConnectionChecklist | null
): { kind: CapabilityBadgeKind; detail: string } {
  if (!platform?.available) {
    return {
      kind: "COMING SOON",
      detail: platform?.blocked_reason ?? "Platform not available for connection.",
    };
  }
  if (!connection || connection.status === "disconnected") {
    return { kind: "DISCONNECTED", detail: "No active connection for this shop." };
  }
  const life = connectionLifecycle(connection, checklist);
  if (life === "error") {
    return {
      kind: "ERROR",
      detail: connection.last_error?.code ?? "Connection reported an error.",
    };
  }
  if (life === "connected") {
    const unverified = platform.verification !== "verified";
    return {
      kind: unverified ? "LIMITED" : "VERIFIED",
      detail: unverified
        ? "Orders path implemented; live provider acceptance still unverified."
        : "Live provider verification recorded.",
    };
  }
  if (life === "limited") {
    return {
      kind: "LIMITED",
      detail: connection.limitations[0] ?? platform.limitations[0] ?? "Some capabilities are limited.",
    };
  }
  return {
    kind: "SETUP REQUIRED",
    detail: checklist?.next_action?.replaceAll("_", " ") ?? "Complete setup and verify a paid order.",
  };
}

export function capabilityBadgeFromState(
  key: string,
  cap: PlatformCapability | undefined
): { kind: CapabilityBadgeKind; label: string; detail: string } {
  const label = key.replaceAll("_", " ");
  if (!cap) {
    return { kind: "UNSUPPORTED", label, detail: "Not reported by catalogue." };
  }
  if (cap.state === "AVAILABLE") {
    return {
      kind: cap.last_verified_at ? "VERIFIED" : "LIMITED",
      label,
      detail: cap.reason ?? (cap.last_verified_at ? "Verified" : "Implemented; live verification pending."),
    };
  }
  if (cap.state === "LIMITED") {
    return { kind: "LIMITED", label, detail: cap.reason ?? "Limited support." };
  }
  return { kind: "UNSUPPORTED", label, detail: cap.reason ?? "Unsupported in this boundary." };
}

export function summarizeCapabilities(caps: Record<string, PlatformCapability> | undefined): string {
  if (!caps) return "Capability matrix not loaded.";
  const parts: string[] = [];
  const order = caps.orders;
  const coupons = caps.coupons_read;
  const banner = caps.banner_embed;
  if (order?.state === "AVAILABLE") parts.push("Orders available");
  else if (order?.state === "LIMITED") parts.push("Orders limited");
  else parts.push("Orders unsupported");
  if (coupons?.state === "UNSUPPORTED") parts.push("coupon reading unsupported");
  else if (coupons?.state === "LIMITED") parts.push("coupon reading limited");
  else parts.push("coupons readable");
  if (banner?.state === "UNSUPPORTED") parts.push("banner unsupported");
  else parts.push("banner requires manual/native install");
  return parts.join("; ") + ".";
}

export async function fetchPlatforms(signal?: AbortSignal): Promise<PlatformCatalogueItem[]> {
  const res = await apiRequest<Data<PlatformCatalogueItem[]>>({
    path: "/api/v1/integrations/platforms",
    signal,
  });
  return (res.data ?? []).map((p) => ({
    ...p,
    category: platformCategory(p.platform, p.available),
  }));
}

export async function fetchConnections(
  workspaceId: string,
  signal?: AbortSignal
): Promise<WebshopConnection[]> {
  const res = await apiRequest<Data<WebshopConnection[]>>({
    path: `/api/v1/workspaces/${workspaceId}/connections`,
    signal,
  });
  return res.data ?? [];
}

export async function fetchConnection(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<WebshopConnection> {
  const res = await apiRequest<Data<WebshopConnection>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}`,
    signal,
  });
  return res.data;
}

export async function createConnection(
  workspaceId: string,
  platform: string,
  body: Record<string, unknown> = {}
): Promise<WebshopConnection> {
  const res = await apiRequest<Data<WebshopConnection>>({
    path: `/api/v1/workspaces/${workspaceId}/connections`,
    method: "POST",
    body: { platform, ...body },
  });
  return res.data;
}

export async function replaceConnectionCredentials(
  workspaceId: string,
  connectionId: string,
  body: Record<string, unknown>
): Promise<WebshopConnection> {
  const res = await apiRequest<Data<WebshopConnection>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/credentials`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function verifyConnection(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<ConnectionChecklist> {
  const res = await apiRequest<Data<ConnectionChecklist>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/verify`,
    method: "POST",
    signal,
  });
  return res.data;
}

export async function disconnectConnection(workspaceId: string, connectionId: string): Promise<WebshopConnection> {
  const res = await apiRequest<Data<WebshopConnection>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}`,
    method: "DELETE",
  });
  return res.data;
}

export async function startShopifyOAuth(
  workspaceId: string,
  shopDomain: string
): Promise<ShopifyOAuthStart> {
  const res = await apiRequest<Data<ShopifyOAuthStart>>({
    path: `/api/v1/workspaces/${workspaceId}/integrations/shopify/oauth`,
    method: "POST",
    body: { shop_domain: shopDomain },
  });
  return res.data;
}

export async function fetchConnectionHealth(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<ConnectionHealth> {
  const res = await apiRequest<Data<ConnectionHealth>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/health`,
    signal,
  });
  return res.data;
}

export async function fetchConnectionCapabilities(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<{ platform: string; status: string; capabilities: Record<string, PlatformCapability> }> {
  const res = await apiRequest<
    Data<{ platform: string; status: string; capabilities: Record<string, PlatformCapability> }>
  >({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/capabilities`,
    signal,
  });
  return res.data;
}

export async function fetchConnectionEvents(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<WebhookEventRow[]> {
  const res = await apiRequest<Data<WebhookEventRow[]>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/events`,
    signal,
  });
  return res.data ?? [];
}

export async function retryConnectionEvent(
  workspaceId: string,
  connectionId: string,
  eventId: string
): Promise<unknown> {
  return apiRequest({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/events/${eventId}/retry`,
    method: "POST",
  });
}

export async function fetchConnectionProducts(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<CatalogProductRow[]> {
  const res = await apiRequest<Data<CatalogProductRow[]>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/products`,
    signal,
  });
  return res.data ?? [];
}

export async function fetchConnectionCoupons(
  workspaceId: string,
  connectionId: string,
  signal?: AbortSignal
): Promise<CatalogCouponRow[]> {
  const res = await apiRequest<Data<CatalogCouponRow[]>>({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/coupons`,
    signal,
  });
  return res.data ?? [];
}

export async function syncConnectionProducts(
  workspaceId: string,
  connectionId: string,
  cursor?: string | null
): Promise<{ run_id: string; imported: number; exhausted: boolean; cursor: string | null }> {
  const res = await apiRequest<
    Data<{ run_id: string; imported: number; exhausted: boolean; cursor: string | null }>
  >({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/sync/products`,
    method: "POST",
    body: cursor ? { cursor } : {},
  });
  return res.data;
}

export async function syncConnectionCoupons(
  workspaceId: string,
  connectionId: string,
  cursor?: string | null
): Promise<{ run_id: string; imported: number; exhausted: boolean; cursor: string | null }> {
  const res = await apiRequest<
    Data<{ run_id: string; imported: number; exhausted: boolean; cursor: string | null }>
  >({
    path: `/api/v1/workspaces/${workspaceId}/connections/${connectionId}/sync/coupons`,
    method: "POST",
    body: cursor ? { cursor } : {},
  });
  return res.data;
}

export async function fetchOrders(
  workspaceId: string,
  params: {
    search?: string;
    payment_status?: string;
    page?: number;
    per_page?: number;
    sort?: string;
  } = {},
  signal?: AbortSignal
): Promise<OrdersPage> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.payment_status) qs.set("payment_status", params.payment_status);
  if (params.page) qs.set("page", String(params.page));
  if (params.per_page) qs.set("per_page", String(params.per_page));
  if (params.sort) qs.set("sort", params.sort);
  const q = qs.toString();
  return apiRequest<OrdersPage>({
    path: `/api/v1/workspaces/${workspaceId}/orders${q ? `?${q}` : ""}`,
    signal,
  });
}

export function paymentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: "Verified",
    pending: "Pending",
    refunded: "Refunded",
    partially_refunded: "Partial refund",
    cancelled: "Cancelled",
    unknown: "Unknown",
  };
  return map[status] ?? status;
}

export function isVerifiedPayment(status: string): boolean {
  return status === "paid";
}

export type ServiceAppStatus = "AVAILABLE" | "ADMIN_ONLY" | "NOT_IMPLEMENTED" | "SETUP_REQUIRED";

export type ServiceAppCard = {
  id: string;
  name: string;
  purpose: string;
  status: ServiceAppStatus;
  href: string | null;
  note: string;
};

/** Service apps are not extra webshop engines — honest status only. */
export const SERVICE_APPS: ServiceAppCard[] = [
  {
    id: "mollie",
    name: "Mollie",
    purpose: "Voucher top-ups / checkout payments",
    status: "SETUP_REQUIRED",
    href: null,
    note: "Used on consumer checkout when configured; not a merchant webshop connector.",
  },
  {
    id: "moneybird",
    name: "Moneybird",
    purpose: "Invoices",
    status: "NOT_IMPLEMENTED",
    href: null,
    note: "Billing invoices are not implemented yet.",
  },
  {
    id: "daisycon",
    name: "Daisycon",
    purpose: "Affiliate network commissions",
    status: "ADMIN_ONLY",
    href: "/admin/affiliate",
    note: "Verified affiliate flow — Super Admin only; never double-credits a direct shop order.",
  },
  {
    id: "tradetracker",
    name: "TradeTracker",
    purpose: "Affiliate network commissions",
    status: "ADMIN_ONLY",
    href: "/admin/affiliate",
    note: "Independent of Daisycon; Super Admin configures network connections.",
  },
  {
    id: "answer24",
    name: "Answer24",
    purpose: "Permitted customer contact calls",
    status: "ADMIN_ONLY",
    href: "/admin/answer24",
    note: "Requires consent, usable phone, campaign link and schedule. No phone/consent = no call.",
  },
  {
    id: "google_places",
    name: "Google Places",
    purpose: "Merchant business directory data",
    status: "AVAILABLE",
    href: "/dashboard/settings",
    note: "Used during onboarding / business profile enrichment — not a webshop sync engine.",
  },
];
