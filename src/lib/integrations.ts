import { apiRequest, ApiError } from "@/lib/api";

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
  category?: "webshop" | "marketplace";
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

const MARKETPLACE_PLATFORMS = new Set(["lightspeed_c", "lightspeed_e"]);

export function platformCategory(platform: string): "webshop" | "marketplace" {
  return MARKETPLACE_PLATFORMS.has(platform) ? "marketplace" : "webshop";
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

export async function fetchPlatforms(signal?: AbortSignal): Promise<PlatformCatalogueItem[]> {
  const res = await apiRequest<Data<PlatformCatalogueItem[]>>({
    path: "/api/v1/integrations/platforms",
    signal,
  });
  return (res.data ?? []).map((p) => ({
    ...p,
    category: platformCategory(p.platform),
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
