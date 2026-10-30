import { apiRequest, ApiError } from "@/lib/api";
import { env } from "@/config/env";
import {
  mergeMerchantLandingContent,
  type MerchantLandingContent,
} from "@/lib/merchantLandingDefaults";
import { isSuperAdmin } from "@/lib/homepage";
import type { Locale } from "@/types/locale";

type Data<T> = { data: T };

export type AdminMerchantLandingState = {
  id: string;
  key?: string;
  locale: string;
  draft_revision: number;
  draft: MerchantLandingContent | null;
  published: MerchantLandingContent | null;
  slug?: string;
};

export { isSuperAdmin };

export async function fetchMerchantLandingServer(
  locale: Locale = "nl"
): Promise<MerchantLandingContent> {
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/content/voor-webshops?locale=${encodeURIComponent(locale)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": locale },
      next: { revalidate: 30, tags: ["voor-webshops"] },
    });
    if (!res.ok) return mergeMerchantLandingContent(null, locale);
    const json = (await res.json()) as {
      data?: { content?: Partial<MerchantLandingContent> } & Partial<MerchantLandingContent>;
    };
    const content = json.data?.content ?? json.data;
    return mergeMerchantLandingContent(content as Partial<MerchantLandingContent>, locale);
  } catch {
    return mergeMerchantLandingContent(null, locale);
  }
}

export async function fetchAdminMerchantLanding(
  locale: Locale = "nl"
): Promise<AdminMerchantLandingState> {
  const res = await apiRequest<Data<AdminMerchantLandingState>>({
    path: `/api/v1/admin/content/voor-webshops?locale=${encodeURIComponent(locale)}`,
    locale,
  });
  return res.data;
}

export async function saveMerchantLandingDraft(payload: {
  locale: Locale;
  revision: number;
  content: MerchantLandingContent;
}): Promise<{ draft_revision: number }> {
  const res = await apiRequest<Data<{ draft_revision: number }>>({
    path: `/api/v1/admin/content/voor-webshops`,
    method: "PUT",
    body: payload,
    locale: payload.locale,
  });
  return res.data;
}

export async function publishMerchantLanding(locale: Locale = "nl"): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/voor-webshops/publish`,
    method: "POST",
    body: { locale },
    locale,
  });
}

export async function fetchMerchantLandingVersions(locale?: Locale): Promise<
  { id: string; locale: string; number: number; published_at: string }[]
> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await apiRequest<
    Data<{ id: string; locale: string; number: number; published_at: string }[]>
  >({
    path: `/api/v1/admin/content/voor-webshops/versions${qs}`,
    locale,
  });
  return res.data;
}

export async function restoreMerchantLandingVersion(
  revisionId: string,
  locale: Locale = "nl"
): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/voor-webshops/restore`,
    method: "POST",
    body: { revision_id: revisionId, locale },
    locale,
  });
}

export async function requestMerchantLandingAiSuggest(payload: {
  locale: Locale;
  field: string;
  text: string;
  intent?: "stronger" | "shorter" | "cta" | "seo" | "translate";
}): Promise<{ suggestion: string; requires_approval: true }> {
  const section = payload.field.split(".")[0] || "hero";
  try {
    const res = await apiRequest<
      Data<{ suggestions: { field: string; suggestion: string }[]; applied: boolean }>
    >({
      path: `/api/v1/admin/content/voor-webshops/ai-suggest`,
      method: "POST",
      body: {
        locale: payload.locale,
        section,
        focus: payload.text || payload.intent || payload.field,
      },
      locale: payload.locale,
    });
    const match =
      res.data.suggestions?.find((s) => s.field === payload.field) ||
      res.data.suggestions?.[0];
    return {
      suggestion: match?.suggestion ?? "",
      requires_approval: true,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }
}
