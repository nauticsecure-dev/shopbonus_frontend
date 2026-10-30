import { apiRequest, ApiError } from "@/lib/api";
import { env } from "@/config/env";
import {
  mergeHomepageContent,
  type HomepageContent,
} from "@/lib/homepageDefaults";
import type { Locale } from "@/types/locale";

type Data<T> = { data: T };

export type PublicDiscountCode = {
  id: string;
  slug: string;
  /** @deprecated prefer slug; kept for older API payloads */
  offer_slug?: string;
  title: string;
  summary: string | null;
  terms: string | null;
  code: string;
  ends_at: string | null;
  webshop: {
    slug: string;
    name: string;
    cover_url: string | null;
    logo_url: string | null;
  };
  href: string;
};

export type SearchSuggestion = {
  type: "webshop" | "category" | "offer" | "discount_code" | "keyword";
  label: string;
  subtitle?: string | null;
  href: string;
};

export type SearchResponse = {
  query: string;
  suggestions: SearchSuggestion[];
  groups?: Record<string, SearchSuggestion[]>;
};

export type AdminHomepageState = {
  id: string;
  key?: string;
  locale: string;
  draft_revision: number;
  draft: HomepageContent | null;
  published: HomepageContent | null;
  slug?: string;
  scheduled_publish_at?: string | null;
};

/** Server-side published homepage (falls back to defaults). */
export async function fetchHomepageContentServer(
  locale: Locale = "nl"
): Promise<HomepageContent> {
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/content/homepage?locale=${encodeURIComponent(locale)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "Accept-Language": locale },
      next: { revalidate: 30, tags: ["homepage"] },
    });
    if (!res.ok) return mergeHomepageContent(null, locale);
    const json = (await res.json()) as { data?: { content?: Partial<HomepageContent> } & Partial<HomepageContent> };
    const content = json.data?.content ?? json.data;
    return mergeHomepageContent(content as Partial<HomepageContent>, locale);
  } catch {
    return mergeHomepageContent(null, locale);
  }
}

export async function fetchHomepageContent(locale?: Locale): Promise<HomepageContent> {
  try {
    const res = await apiRequest<Data<{ content: Partial<HomepageContent> } | Partial<HomepageContent>>>({
      path: `/api/v1/content/homepage?locale=${encodeURIComponent(locale ?? "nl")}`,
      locale,
    });
    const content =
      res.data && typeof res.data === "object" && "content" in res.data
        ? (res.data as { content: Partial<HomepageContent> }).content
        : (res.data as Partial<HomepageContent>);
    return mergeHomepageContent(content, (locale ?? "nl") as "nl" | "en");
  } catch {
    return mergeHomepageContent(null, (locale ?? "nl") as "nl" | "en");
  }
}

export async function fetchDiscountCodes(opts: {
  limit?: number;
  search?: string;
  signal?: AbortSignal;
} = {}): Promise<PublicDiscountCode[]> {
  const params = new URLSearchParams();
  if (opts.limit) params.set("limit", String(opts.limit));
  if (opts.search) params.set("search", opts.search);
  const qs = params.toString();
  try {
    const res = await apiRequest<Data<PublicDiscountCode[]>>({
      path: `/api/v1/public/discount-codes${qs ? `?${qs}` : ""}`,
      signal: opts.signal,
    });
    return res.data ?? [];
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}

export async function fetchDiscountCodesServer(limit = 2): Promise<PublicDiscountCode[]> {
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/public/discount-codes?limit=${limit}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: PublicDiscountCode[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function searchPublic(
  q: string,
  opts: { locale?: Locale; limit?: number; signal?: AbortSignal } = {}
): Promise<SearchResponse> {
  const params = new URLSearchParams({ q });
  if (opts.locale) params.set("locale", opts.locale);
  if (opts.limit) params.set("limit", String(opts.limit));
  try {
    const res = await apiRequest<
      Data<{
        query?: string;
        suggestions?: SearchSuggestion[];
        groups?: Record<string, Array<{ label?: string; name?: string; slug?: string; href: string; subtitle?: string; type?: string }>>;
      }>
    >({
      path: `/api/v1/public/search?${params}`,
      signal: opts.signal,
      locale: opts.locale,
    });
    const payload = res.data;
    if (payload.suggestions?.length) {
      return { query: payload.query ?? q, suggestions: payload.suggestions, groups: payload.groups as SearchResponse["groups"] };
    }
    const suggestions: SearchSuggestion[] = [];
    for (const [group, rows] of Object.entries(payload.groups ?? {})) {
      for (const row of rows) {
        const type =
          group === "webshops"
            ? "webshop"
            : group === "offers"
              ? "offer"
              : group === "categories"
                ? "category"
                : group === "discount_codes"
                  ? "discount_code"
                  : "keyword";
        suggestions.push({
          type,
          label: row.label || row.name || row.slug || row.href,
          subtitle: row.subtitle,
          href: row.href,
        });
      }
    }
    return { query: payload.query ?? q, suggestions, groups: payload.groups as SearchResponse["groups"] };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 405)) {
      const shops = await apiRequest<{
        data: { slug: string; name: string; short_description?: string | null }[];
      }>({
        path: `/api/v1/public/webshops?search=${encodeURIComponent(q)}&per_page=${opts.limit ?? 8}`,
        signal: opts.signal,
        locale: opts.locale,
      });
      const suggestions: SearchSuggestion[] = (shops.data ?? []).map((s) => ({
        type: "webshop" as const,
        label: s.name,
        subtitle: s.short_description,
        href: `/webshops/${s.slug}`,
      }));
      return { query: q, suggestions, groups: { webshops: suggestions } };
    }
    throw err;
  }
}

export async function fetchAdminHomepage(locale: Locale = "nl"): Promise<AdminHomepageState> {
  const res = await apiRequest<Data<AdminHomepageState>>({
    path: `/api/v1/admin/content/homepage?locale=${encodeURIComponent(locale)}`,
    locale,
  });
  return res.data;
}

export async function patchHomepageSection(
  sectionKey: string,
  payload: {
    locale: Locale;
    revision: number;
    content: Record<string, unknown>;
  }
): Promise<{ draft_revision: number }> {
  const res = await apiRequest<Data<{ draft_revision: number }>>({
    path: `/api/v1/admin/content/homepage/sections/${encodeURIComponent(sectionKey)}`,
    method: "PATCH",
    body: payload,
    locale: payload.locale,
  });
  return res.data;
}

export async function saveHomepageDraft(payload: {
  locale: Locale;
  revision: number;
  content: HomepageContent;
}): Promise<{ draft_revision: number }> {
  const res = await apiRequest<Data<{ draft_revision: number }>>({
    path: `/api/v1/admin/content/homepage`,
    method: "PUT",
    body: payload,
    locale: payload.locale,
  });
  return res.data;
}

export async function previewHomepage(locale: Locale = "nl"): Promise<HomepageContent> {
  const res = await apiRequest<Data<{ content: Partial<HomepageContent> }>>({
    path: `/api/v1/admin/content/homepage/preview`,
    method: "POST",
    body: { locale },
    locale,
  });
  return mergeHomepageContent(res.data.content, locale as "nl" | "en");
}

export async function publishHomepage(locale: Locale = "nl"): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/homepage/publish`,
    method: "POST",
    body: { locale },
    locale,
  });
}

export async function fetchHomepageVersions(locale?: Locale): Promise<
  { id: string; locale: string; number: number; published_at: string }[]
> {
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await apiRequest<
    Data<{ id: string; locale: string; number: number; published_at: string }[]>
  >({
    path: `/api/v1/admin/content/homepage/versions${qs}`,
    locale,
  });
  return res.data;
}

export async function restoreHomepageVersion(
  revisionId: string,
  locale: Locale = "nl"
): Promise<void> {
  await apiRequest({
    path: `/api/v1/admin/content/homepage/restore`,
    method: "POST",
    body: { revision_id: revisionId, locale },
    locale,
  });
}

export async function scheduleHomepage(payload: {
  locale: Locale;
  revision: number;
  publish_at?: string | null;
  unpublish_at?: string | null;
}): Promise<{ draft_revision: number }> {
  const res = await apiRequest<Data<{ draft_revision: number }>>({
    path: `/api/v1/admin/content/homepage/schedule`,
    method: "POST",
    body: payload,
    locale: payload.locale,
  });
  return res.data;
}

export async function requestHomepageAiSuggest(payload: {
  locale: Locale;
  field: string;
  text: string;
  intent?: "stronger" | "shorter" | "cta" | "seo" | "translate";
}): Promise<{ suggestion: string; requires_approval: true }> {
  const section = payload.field.split(".")[0] || "hero";
  const res = await apiRequest<
    Data<{ suggestions: { field: string; suggestion: string }[]; applied: boolean }>
  >({
    path: `/api/v1/admin/content/homepage/ai-suggest`,
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
}

export function isSuperAdmin(roles: string[] | undefined | null): boolean {
  return Array.isArray(roles) && roles.includes("super_admin");
}
