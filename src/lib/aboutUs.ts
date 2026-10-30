import { apiRequest, ApiError } from "@/lib/api";
import { env } from "@/config/env";
import { mergeAboutUsContent, type AboutUsContent } from "@/lib/aboutUsDefaults";
import { isSuperAdmin } from "@/lib/homepage";
import type { Locale } from "@/types/locale";

type Data<T> = { data: T };

export type AdminAboutUsState = {
  id: string;
  key?: string;
  locale: string;
  draft_revision: number;
  draft: AboutUsContent | null;
  published: AboutUsContent | null;
  slug?: string;
};

export { isSuperAdmin };

export async function fetchAboutUsServer(locale: Locale = "nl"): Promise<AboutUsContent> {
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/content/over-ons?locale=${encodeURIComponent(locale)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": locale },
      next: { revalidate: 30, tags: ["over-ons"] },
    });
    if (!res.ok) return mergeAboutUsContent(null, locale);
    const json = (await res.json()) as {
      data?: { content?: Partial<AboutUsContent> } & Partial<AboutUsContent>;
    };
    const content = json.data?.content ?? json.data;
    return mergeAboutUsContent(content as Partial<AboutUsContent>, locale);
  } catch {
    return mergeAboutUsContent(null, locale);
  }
}

export async function fetchAdminAboutUs(locale: Locale = "nl"): Promise<AdminAboutUsState> {
  const res = await apiRequest<Data<AdminAboutUsState>>({
    path: `/api/v1/admin/content/over-ons?locale=${encodeURIComponent(locale)}`,
    locale,
  });
  return res.data;
}

export async function saveAboutUsDraft(payload: {
  locale: Locale;
  revision: number;
  content: AboutUsContent;
}): Promise<{ draft_revision: number }> {
  const res = await apiRequest<Data<{ draft_revision: number }>>({
    path: `/api/v1/admin/content/over-ons`,
    method: "PUT",
    body: payload,
    locale: payload.locale,
  });
  return res.data;
}

export async function publishAboutUs(locale: Locale = "nl"): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/over-ons/publish`,
    method: "POST",
    body: { locale },
    locale,
  });
}

export async function fetchAboutUsVersions(
  locale?: Locale
): Promise<{ id: string; locale: string; number: number; published_at: string }[]> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await apiRequest<
    Data<{ id: string; locale: string; number: number; published_at: string }[]>
  >({
    path: `/api/v1/admin/content/over-ons/versions${qs}`,
    locale,
  });
  return res.data;
}

export async function restoreAboutUsVersion(
  revisionId: string,
  locale: Locale = "nl"
): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/over-ons/restore`,
    method: "POST",
    body: { revision_id: revisionId, locale },
    locale,
  });
}

export async function requestAboutUsAiSuggest(payload: {
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
      path: `/api/v1/admin/content/over-ons/ai-suggest`,
      method: "POST",
      body: {
        locale: payload.locale,
        section,
        focus: payload.text || payload.intent || payload.field,
      },
      locale: payload.locale,
    });
    const match =
      res.data.suggestions?.find((s) => s.field === payload.field) || res.data.suggestions?.[0];
    return {
      suggestion: match?.suggestion ?? "",
      requires_approval: true,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw err;
  }
}
