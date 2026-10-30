import { apiRequest } from "@/lib/api";
import type { CmsPageContent, RichDoc } from "@/lib/richText";
import type { Locale } from "@/types/locale";

type Data<T> = { data: T };

export type CmsPageType =
  | "privacy"
  | "terms"
  | "cookie_policy"
  | "help"
  | "faq"
  | "info"
  | "landing";

export type CmsPageLocaleSummary = {
  slug: string;
  published: boolean;
  draft_revision: number;
  draft_updated_at?: string | null;
};

export type CmsPageSummary = {
  id: string;
  key: string;
  type: CmsPageType;
  audience: string;
  archived: boolean;
  locales: Partial<Record<Locale, CmsPageLocaleSummary>>;
};

export type CmsPageDetail = CmsPageSummary & {
  locales_detail: Partial<
    Record<
      Locale,
      {
        slug: string;
        draft_revision: number;
        draft: CmsPageContent | null;
        published: CmsPageContent | null;
      }
    >
  >;
};

export type CmsRevision = {
  id: string;
  locale: Locale;
  number: number;
  legal_version: string | null;
  effective_date: string | null;
  approved_by: string | null;
  published_by: string | null;
  restored_from: number | null;
  published_at: string;
};

export type TranslationStatusRow = {
  page: string;
  locale: Locale;
  status: "missing" | "unpublished" | "draft_differs" | "published";
};

export type PublicCmsPage = {
  key: string;
  type: string;
  locale: string;
  slug: string;
  content: CmsPageContent;
  legal?: { version: string; effective_date: string } | null;
  revision: number;
  published_at: string;
  alternates: Partial<Record<Locale, string>>;
  fallback?: boolean;
};

export type FaqAudience = "public" | "consumers" | "merchants";

export type FaqItemAdmin = {
  id: string;
  audience: FaqAudience;
  published: boolean;
  position: number;
  revision: number;
  translations: Partial<
    Record<Locale, { question: string; answer: RichDoc }>
  >;
};

export type FaqCategoryAdmin = {
  id: string;
  key: string;
  names: Record<Locale, string>;
  position: number;
  items: FaqItemAdmin[];
};

export type PublicFaqItem = {
  id: string;
  question: string;
  answer: RichDoc;
  audience: FaqAudience;
  fallback?: boolean;
};

export type PublicFaqCategory = {
  key: string;
  name: string;
  items: PublicFaqItem[];
};

export type CookiePolicyAdminSummary = {
  id: string;
  version: string;
  status: "draft" | "published" | "retired";
  requires_reconsent: boolean;
  published_at: string | null;
};

export function isSuperAdmin(roles?: string[] | null): boolean {
  return Array.isArray(roles) && roles.includes("super_admin");
}

export async function fetchPublicPage(
  locale: Locale,
  slug: string
): Promise<PublicCmsPage> {
  const res = await apiRequest<Data<PublicCmsPage>>({
    path: `/api/v1/public/pages/${encodeURIComponent(locale)}/${encodeURIComponent(slug)}`,
    locale,
  });
  return res.data;
}

export async function fetchPublicFaq(
  locale: Locale,
  search = ""
): Promise<PublicFaqCategory[]> {
  const q = search.trim()
    ? `?locale=${encodeURIComponent(locale)}&search=${encodeURIComponent(search.trim())}`
    : `?locale=${encodeURIComponent(locale)}`;
  const res = await apiRequest<Data<PublicFaqCategory[]>>({
    path: `/api/v1/public/faq${q}`,
    locale,
  });
  return res.data;
}

export async function listCmsPages(opts?: {
  type?: CmsPageType;
  search?: string;
  locale?: Locale;
}): Promise<CmsPageSummary[]> {
  const params = new URLSearchParams();
  if (opts?.type) params.set("type", opts.type);
  if (opts?.search) params.set("search", opts.search);
  const qs = params.toString();
  const res = await apiRequest<Data<CmsPageSummary[]>>({
    path: `/api/v1/admin/cms/pages${qs ? `?${qs}` : ""}`,
    locale: opts?.locale,
  });
  return res.data;
}

export async function fetchCmsPage(id: string, locale?: Locale): Promise<CmsPageDetail> {
  const res = await apiRequest<Data<CmsPageDetail>>({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(id)}`,
    locale,
  });
  return res.data;
}

export async function createCmsPage(body: {
  key: string;
  type: CmsPageType;
  audience?: FaqAudience;
  locales: Partial<Record<Locale, { slug: string; content: CmsPageContent }>>;
  locale?: Locale;
}): Promise<CmsPageSummary> {
  const { locale, ...payload } = body;
  const res = await apiRequest<Data<CmsPageSummary>>({
    path: "/api/v1/admin/cms/pages",
    method: "POST",
    body: payload,
    locale,
  });
  return res.data;
}

export async function saveCmsDraft(opts: {
  pageId: string;
  locale: Locale;
  revision: number;
  content: CmsPageContent;
  slug?: string;
}): Promise<{ locale: string; slug: string; draft_revision: number }> {
  const res = await apiRequest<
    Data<{ locale: string; slug: string; draft_revision: number }>
  >({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(opts.pageId)}/locales/${opts.locale}`,
    method: "PUT",
    body: {
      revision: opts.revision,
      content: opts.content,
      ...(opts.slug ? { slug: opts.slug } : {}),
    },
    locale: opts.locale,
  });
  return res.data;
}

export async function previewCmsDraft(
  pageId: string,
  locale: Locale
): Promise<{ locale: string; slug: string; content: CmsPageContent; preview: true }> {
  const res = await apiRequest<
    Data<{ locale: string; slug: string; content: CmsPageContent; preview: true }>
  >({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/locales/${locale}/preview`,
    locale,
  });
  return res.data;
}

export async function publishCmsLocale(opts: {
  pageId: string;
  locale: Locale;
  legal_version?: string;
  effective_date?: string;
  approve?: boolean;
}): Promise<CmsRevision> {
  const res = await apiRequest<Data<CmsRevision>>({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(opts.pageId)}/locales/${opts.locale}/publish`,
    method: "POST",
    body: {
      legal_version: opts.legal_version,
      effective_date: opts.effective_date,
      approve: opts.approve,
    },
    locale: opts.locale,
  });
  return res.data;
}

export async function listCmsRevisions(pageId: string, locale?: Locale): Promise<CmsRevision[]> {
  const res = await apiRequest<Data<CmsRevision[]>>({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/revisions`,
    locale,
  });
  return res.data;
}

export async function restoreCmsRevision(
  pageId: string,
  revisionId: string,
  locale?: Locale
): Promise<CmsRevision> {
  const res = await apiRequest<Data<CmsRevision>>({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/revisions/${encodeURIComponent(revisionId)}/restore`,
    method: "POST",
    locale,
  });
  return res.data;
}

export async function archiveCmsPage(pageId: string, locale?: Locale): Promise<CmsPageSummary> {
  const res = await apiRequest<Data<CmsPageSummary>>({
    path: `/api/v1/admin/cms/pages/${encodeURIComponent(pageId)}/archive`,
    method: "POST",
    locale,
  });
  return res.data;
}

export async function listTranslationStatuses(locale?: Locale): Promise<TranslationStatusRow[]> {
  const res = await apiRequest<Data<TranslationStatusRow[]>>({
    path: "/api/v1/admin/cms/translations",
    locale,
  });
  return res.data;
}

export async function listAdminFaq(locale?: Locale): Promise<FaqCategoryAdmin[]> {
  const res = await apiRequest<Data<FaqCategoryAdmin[]>>({
    path: "/api/v1/admin/cms/faq",
    locale,
  });
  return res.data;
}

export async function createFaqCategory(body: {
  key: string;
  names: Record<Locale, string>;
  locale?: Locale;
}): Promise<{ id: string; key: string; names: Record<Locale, string>; position: number }> {
  const { locale, ...payload } = body;
  const res = await apiRequest<
    Data<{ id: string; key: string; names: Record<Locale, string>; position: number }>
  >({
    path: "/api/v1/admin/cms/faq/categories",
    method: "POST",
    body: payload,
    locale,
  });
  return res.data;
}

export async function createFaqItem(body: {
  category_id: string;
  audience?: FaqAudience;
  published?: boolean;
  translations: Partial<Record<Locale, { question: string; answer: RichDoc }>>;
  locale?: Locale;
}): Promise<FaqItemAdmin> {
  const { locale, ...payload } = body;
  const res = await apiRequest<Data<FaqItemAdmin>>({
    path: "/api/v1/admin/cms/faq/items",
    method: "POST",
    body: payload,
    locale,
  });
  return res.data;
}

export async function updateFaqItem(
  itemId: string,
  body: {
    revision: number;
    audience?: FaqAudience;
    published?: boolean;
    translations?: Partial<Record<Locale, { question: string; answer: RichDoc }>>;
  },
  locale?: Locale
): Promise<FaqItemAdmin> {
  const res = await apiRequest<Data<FaqItemAdmin>>({
    path: `/api/v1/admin/cms/faq/items/${encodeURIComponent(itemId)}`,
    method: "PUT",
    body,
    locale,
  });
  return res.data;
}

export async function reorderFaq(
  categoryId: string,
  itemIds: string[],
  locale?: Locale
): Promise<FaqCategoryAdmin[]> {
  const res = await apiRequest<Data<FaqCategoryAdmin[]>>({
    path: "/api/v1/admin/cms/faq/reorder",
    method: "POST",
    body: { category_id: categoryId, items: itemIds },
    locale,
  });
  return res.data;
}

export async function listCookiePolicies(locale?: Locale): Promise<CookiePolicyAdminSummary[]> {
  const res = await apiRequest<Data<CookiePolicyAdminSummary[]>>({
    path: "/api/v1/admin/cms/cookie-policies",
    locale,
  });
  return res.data;
}

export async function createCookiePolicy(
  body: Record<string, unknown>,
  locale?: Locale
): Promise<Record<string, unknown>> {
  const res = await apiRequest<Data<Record<string, unknown>>>({
    path: "/api/v1/admin/cms/cookie-policies",
    method: "POST",
    body,
    locale,
  });
  return res.data;
}

export async function updateCookiePolicy(
  id: string,
  body: Record<string, unknown>,
  locale?: Locale
): Promise<Record<string, unknown>> {
  const res = await apiRequest<Data<Record<string, unknown>>>({
    path: `/api/v1/admin/cms/cookie-policies/${encodeURIComponent(id)}`,
    method: "PUT",
    body,
    locale,
  });
  return res.data;
}

export async function publishCookiePolicy(id: string, locale?: Locale): Promise<Record<string, unknown>> {
  const res = await apiRequest<Data<Record<string, unknown>>>({
    path: `/api/v1/admin/cms/cookie-policies/${encodeURIComponent(id)}/publish`,
    method: "POST",
    locale,
  });
  return res.data;
}

export async function cookieConsentStats(
  version?: string,
  locale?: Locale
): Promise<{ version: string | null; by_action: Record<string, number> }> {
  const qs = version ? `?version=${encodeURIComponent(version)}` : "";
  const res = await apiRequest<Data<{ version: string | null; by_action: Record<string, number> }>>({
    path: `/api/v1/admin/cms/cookie-consents/stats${qs}`,
    locale,
  });
  return res.data;
}
