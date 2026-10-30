import { apiRequest, ApiError } from "@/lib/api";
import { env } from "@/config/env";

export { ApiError };

type Data<T> = { data: T };

export const BANNER_TEMPLATES = [
  "ribbon",
  "inline_card",
  "floating",
  "teaser",
  "popup",
  "exit_intent",
  "cart_progress",
] as const;

export type BannerTemplate = (typeof BANNER_TEMPLATES)[number];

export const BANNER_ANCHORS = [
  "top",
  "bottom",
  "top_left",
  "top_right",
  "bottom_left",
  "bottom_right",
  "inline",
] as const;

export type BannerAnchor = (typeof BANNER_ANCHORS)[number];

export type BannerTrigger =
  | { all: BannerTrigger[] }
  | { any: BannerTrigger[] }
  | {
      type: string;
      value?: unknown;
      negate?: boolean;
    };

export type BannerConfig = {
  template: BannerTemplate;
  placement: {
    anchor: BannerAnchor;
    offset_x?: number;
    offset_y?: number;
    selector_hint?: string | null;
  };
  content: {
    heading: string;
    subtitle?: string | null;
    cta_label: string;
    cta_url: string;
    terms?: string | null;
    image_asset_id?: string | null;
  };
  style: {
    background: string;
    text: string;
    accent?: string;
    font: string;
    animation: "none" | "fade_in" | "slide_in";
    radius?: number;
  };
  devices: Array<"desktop" | "tablet" | "mobile">;
  frequency: {
    per_session: number;
    cooldown_hours?: number;
    hide_after_dismiss?: boolean;
  };
  priority?: number;
  triggers: BannerTrigger;
};

export type BannerCampaignSummary = {
  id: string;
  name: string;
  status: string;
  template?: string | null;
  placement?: string | null;
  offer_id?: string | null;
  draft_revision?: number;
  live_version?: number | null;
  published_version?: number | null;
  scheduled_at?: string | null;
  updated_at?: string;
  stats_30d?: {
    viewable_impressions?: number;
    cta_clicks?: number;
    ctr?: number | null;
    attributed_orders?: number;
  };
};

export type BannerCampaignDetail = BannerCampaignSummary & {
  draft_config?: BannerConfig | Record<string, unknown>;
  published_config?: BannerConfig | Record<string, unknown> | null;
  notice?: string;
};

export type BannerInstallation = {
  public_key: string;
  allowed_origins: string[];
  status: "not_seen" | "installed" | "stale" | string;
  last_seen: { origin: string; at: string } | null;
  live_campaigns: number;
  snippet: string;
};

export type BannerResults = {
  eligible: number;
  viewable_impressions: number;
  cta_clicks: number;
  dismissals: number;
  ctr: number | null;
  attributed_orders?: number;
  attributed_revenue_minor?: number;
  unattributed_orders?: number;
};

export type BannerSimulation = {
  shown: boolean;
  reasons: string[];
  cart_progress: {
    cart_total_minor: number;
    threshold_minor: number;
    remaining_minor: number;
    percent: number;
  } | null;
  fallback: string | null;
  simulated: boolean;
};

export type BannerAiRun = {
  id: string;
  kind: string;
  status: string;
  created_at?: string;
  human_review_required?: boolean;
  proposals?: Array<Record<string, unknown>>;
  measured_uplift?: null;
};

export type BannerVersionRow = {
  version: number;
  live: boolean;
  published_at: string;
  published_by: string | null;
};

export type BannerPairing = {
  pairing_token: string;
  expires_in: number;
  origin: string;
};

export type BannerAsset = {
  id: string;
  width: number;
  height: number;
  url: string;
};

/** Merchant cost: reward + 30% ShopBonus fee (authoritative funding formula). */
export function merchantCostFromReward(rewardMinor: number): {
  reward_minor: number;
  fee_minor: number;
  total_minor: number;
} {
  const fee = Math.round(rewardMinor * 0.3);
  return { reward_minor: rewardMinor, fee_minor: fee, total_minor: rewardMinor + fee };
}

/** Branch offer examples used in Studio (Fashion €100→€10, Electronics €100→€4). */
export const BRANCH_OFFER_PREVIEWS = [
  {
    category: "Fashion",
    key: "fashion",
    threshold_minor: 10000,
    reward_minor: 1000,
    note: "Spend €100, earn €10 for your NEXT purchase",
  },
  {
    category: "Electronics",
    key: "electronics",
    threshold_minor: 10000,
    reward_minor: 400,
    note: "Spend €100, earn €4 for your NEXT purchase",
  },
] as const;

export async function listBanners(
  workspaceId: string,
  params: { status?: string; search?: string; placement?: string } = {},
  signal?: AbortSignal
): Promise<BannerCampaignSummary[]> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.search) qs.set("search", params.search);
  if (params.placement) qs.set("placement", params.placement);
  const q = qs.toString();
  const res = await apiRequest<Data<BannerCampaignSummary[]>>({
    path: `/api/v1/workspaces/${workspaceId}/banners${q ? `?${q}` : ""}`,
    signal,
  });
  return res.data ?? [];
}

export async function createBanner(
  workspaceId: string,
  body: { name: string; offer_id?: string | null; config: BannerConfig | Record<string, unknown> }
): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function fetchBanner(
  workspaceId: string,
  bannerId: string,
  signal?: AbortSignal
): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}`,
    signal,
  });
  return res.data;
}

export async function saveBannerDraft(
  workspaceId: string,
  bannerId: string,
  body: { revision: number; config: BannerConfig | Record<string, unknown>; name?: string }
): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}`,
    method: "PUT",
    body,
  });
  return res.data;
}

export async function duplicateBanner(workspaceId: string, bannerId: string): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/duplicate`,
    method: "POST",
  });
  return res.data;
}

export async function publishBanner(workspaceId: string, bannerId: string): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/publish`,
    method: "POST",
  });
  return res.data;
}

export async function scheduleBanner(
  workspaceId: string,
  bannerId: string,
  publishAt: string
): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/schedule`,
    method: "POST",
    body: { publish_at: publishAt },
  });
  return res.data;
}

export async function pauseBanner(workspaceId: string, bannerId: string): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/pause`,
    method: "POST",
  });
  return res.data;
}

export async function resumeBanner(workspaceId: string, bannerId: string): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/resume`,
    method: "POST",
  });
  return res.data;
}

export async function rollbackBanner(
  workspaceId: string,
  bannerId: string,
  version: number
): Promise<BannerCampaignDetail> {
  const res = await apiRequest<Data<BannerCampaignDetail>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/rollback`,
    method: "POST",
    body: { version },
  });
  return res.data;
}

export async function fetchBannerVersions(
  workspaceId: string,
  bannerId: string,
  signal?: AbortSignal
): Promise<BannerVersionRow[]> {
  const res = await apiRequest<Data<BannerVersionRow[]>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/versions`,
    signal,
  });
  return res.data ?? [];
}

export async function fetchBannerResults(
  workspaceId: string,
  bannerId: string,
  params: { from?: string; to?: string; device?: string } = {},
  signal?: AbortSignal
): Promise<BannerResults> {
  const qs = new URLSearchParams();
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  if (params.device) qs.set("device", params.device);
  const q = qs.toString();
  const res = await apiRequest<Data<BannerResults>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/results${q ? `?${q}` : ""}`,
    signal,
  });
  return res.data;
}

export async function simulateBanner(
  workspaceId: string,
  bannerId: string,
  ctx: Record<string, unknown>
): Promise<BannerSimulation> {
  const res = await apiRequest<Data<BannerSimulation>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/simulate`,
    method: "POST",
    body: ctx,
  });
  return res.data;
}

export async function fetchBannerInstallation(
  workspaceId: string,
  signal?: AbortSignal
): Promise<BannerInstallation> {
  const res = await apiRequest<Data<BannerInstallation>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/installation`,
    signal,
  });
  return res.data;
}

export async function updateBannerInstallation(
  workspaceId: string,
  origins: string[]
): Promise<BannerInstallation> {
  const res = await apiRequest<Data<BannerInstallation>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/installation`,
    method: "PUT",
    body: { origins },
  });
  return res.data;
}

export async function requestBannerPairing(workspaceId: string, origin: string): Promise<BannerPairing> {
  const res = await apiRequest<Data<BannerPairing>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/pairing`,
    method: "POST",
    body: { origin },
  });
  return res.data;
}

export async function uploadBannerAsset(workspaceId: string, file: File): Promise<BannerAsset> {
  const form = new FormData();
  form.append("image", file);
  const { ensureCsrfCookie } = await import("@/lib/api");
  if (env.useCookieAuth) await ensureCsrfCookie();
  const xsrf =
    typeof document !== "undefined"
      ? document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)?.[1]
      : null;
  const res = await fetch(`${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/workspaces/${workspaceId}/banners/assets`, {
    method: "POST",
    credentials: env.useCookieAuth ? "include" : "same-origin",
    headers: {
      Accept: "application/json",
      ...(xsrf ? { "X-XSRF-TOKEN": decodeURIComponent(xsrf) } : {}),
    },
    body: form,
  });
  const json = (await res.json()) as Data<BannerAsset> & { error?: { message?: string } };
  if (!res.ok) throw new ApiError(json.error?.message || "Upload failed", res.status);
  return json.data;
}

export async function requestBannerAi(
  workspaceId: string,
  bannerId: string,
  kind: "designs" | "insights",
  requestKey: string,
  extra?: Record<string, unknown>
): Promise<BannerAiRun> {
  const res = await apiRequest<Data<BannerAiRun>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/ai-requests`,
    method: "POST",
    body: { kind, request_key: requestKey, ...extra },
  });
  return res.data;
}

export async function fetchBannerAiRun(
  workspaceId: string,
  bannerId: string,
  runId: string,
  signal?: AbortSignal
): Promise<BannerAiRun> {
  const res = await apiRequest<Data<BannerAiRun>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/ai-requests/${runId}`,
    signal,
  });
  return res.data;
}

export async function reviewBannerAi(
  workspaceId: string,
  bannerId: string,
  runId: string,
  body: { decision: "accept" | "reject"; proposal?: number; note: string }
): Promise<{ request: BannerAiRun; draft_campaign: string | null; published: boolean }> {
  const res = await apiRequest<
    Data<{ request: BannerAiRun; draft_campaign: string | null; published: boolean }>
  >({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/ai-requests/${runId}/review`,
    method: "POST",
    body,
  });
  return res.data;
}

export async function createBannerExperiment(
  workspaceId: string,
  bannerId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await apiRequest<Data<unknown>>({
    path: `/api/v1/workspaces/${workspaceId}/banners/${bannerId}/experiment`,
    method: "POST",
    body,
  });
  return res.data;
}

export function bannerStatusLabel(status: string): string {
  const map: Record<string, string> = {
    draft: "Draft",
    scheduled: "Scheduled",
    live: "Live",
    paused: "Paused",
  };
  return map[status] ?? status;
}

export function templateLabel(t: string): string {
  const map: Record<string, string> = {
    ribbon: "Ribbon",
    inline_card: "Inline category card",
    floating: "Floating reward card",
    teaser: "Chat-style teaser",
    popup: "Popup",
    exit_intent: "Exit intent",
    cart_progress: "Cart progress",
  };
  return map[t] ?? t;
}

/** Safe default draft config aligned with Laravel BannerConfig schema. */
export function defaultBannerConfig(siteOrigin = "https://example.nl"): BannerConfig {
  return {
    template: "floating",
    placement: { anchor: "bottom_right", offset_x: 0, offset_y: 0, selector_hint: null },
    content: {
      heading: "Spend €100, earn €10 ShopBonus",
      subtitle: "For your NEXT purchase",
      cta_label: "View offer",
      cta_url: `${siteOrigin.replace(/\/$/, "")}/shopbonus`,
      terms: "Min. spend €100 · reward on next order",
      image_asset_id: null,
    },
    style: {
      background: "#0b74ff",
      text: "#ffffff",
      accent: "#ffffff",
      font: "inter",
      animation: "fade_in",
      radius: 16,
    },
    devices: ["desktop", "mobile"],
    frequency: { per_session: 1, cooldown_hours: 0, hide_after_dismiss: true },
    priority: 50,
    triggers: {
      all: [
        { type: "url_match", value: "/collections/*" },
        { type: "category", value: ["fashion"] },
        { type: "min_seconds", value: 20 },
      ],
    },
  };
}

export function formatCtr(ctr: number | null | undefined): string {
  if (ctr == null || Number.isNaN(ctr)) return "—";
  return `${(ctr * 100).toFixed(1)}%`;
}

export function formatMinor(minor: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency }).format(minor / 100);
}

export const EMBED_MSG_SCHEMA = "shopbonus.banner.v1";

export function embedScriptUrl(): string {
  return `${env.apiBaseUrl.replace(/\/$/, "")}/embed/v1.js`;
}
