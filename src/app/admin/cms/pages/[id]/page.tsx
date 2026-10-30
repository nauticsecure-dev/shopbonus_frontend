"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import RichTextEditor from "@/components/cms/RichTextEditor";
import RichTextView from "@/components/cms/RichTextView";
import { ApiError } from "@/lib/api";
import {
  archiveCmsPage,
  fetchCmsPage,
  listCmsRevisions,
  previewCmsDraft,
  publishCmsLocale,
  restoreCmsRevision,
  saveCmsDraft,
  type CmsPageDetail,
  type CmsRevision,
} from "@/lib/cms";
import { emptyPageContent, type CmsPageContent } from "@/lib/richText";
import { useLocale } from "@/i18n/LocaleContext";
import type { Locale } from "@/types/locale";

const LEGAL_TYPES = new Set(["privacy", "terms", "cookie_policy"]);

export default function AdminCmsPageEditor() {
  const params = useParams<{ id: string }>();
  const pageId = params.id;
  const { locale: uiLocale, dictionary: t } = useLocale();
  const [editLocale, setEditLocale] = useState<Locale>("nl");
  const [page, setPage] = useState<CmsPageDetail | null>(null);
  const [content, setContent] = useState<CmsPageContent>(emptyPageContent());
  const [slug, setSlug] = useState("");
  const [revision, setRevision] = useState(1);
  const [revisions, setRevisions] = useState<CmsRevision[]>([]);
  const [preview, setPreview] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [legalVersion, setLegalVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!pageId) return;
    setError(null);
    try {
      const detail = await fetchCmsPage(pageId, uiLocale);
      setPage(detail);
      const loc = detail.locales_detail[editLocale];
      setContent(loc?.draft ?? loc?.published ?? emptyPageContent());
      setSlug(loc?.slug ?? detail.locales[editLocale]?.slug ?? "");
      setRevision(loc?.draft_revision ?? detail.locales[editLocale]?.draft_revision ?? 1);
      const revs = await listCmsRevisions(pageId, uiLocale);
      setRevisions(revs.filter((r) => r.locale === editLocale));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  }, [pageId, editLocale, uiLocale, t.errorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSaveDraft() {
    if (!pageId || busy) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await saveCmsDraft({
        pageId,
        locale: editLocale,
        revision,
        content,
        slug,
      });
      setRevision(res.draft_revision);
      setSlug(res.slug);
      setMessage(t.cmsDraftSaved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t.cmsConflict);
      else setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function onPreview() {
    if (!pageId) return;
    setError(null);
    try {
      const res = await previewCmsDraft(pageId, editLocale);
      setContent(res.content);
      setSlug(res.slug);
      setPreview(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  }

  async function onPublish() {
    if (!pageId || busy || !page) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const needsLegal = LEGAL_TYPES.has(page.type);
      await publishCmsLocale({
        pageId,
        locale: editLocale,
        legal_version: needsLegal ? legalVersion || undefined : undefined,
        effective_date: needsLegal ? effectiveDate || undefined : undefined,
        approve: needsLegal ? true : undefined,
      });
      setMessage(t.cmsPublished);
      setPreview(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function onRestore(revisionId: string) {
    if (!pageId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await restoreCmsRevision(pageId, revisionId, uiLocale);
      setMessage(uiLocale === "en" ? "Restored as new revision" : "Hersteld als nieuwe revisie");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function onArchive() {
    if (!pageId || busy) return;
    setBusy(true);
    try {
      await archiveCmsPage(pageId, uiLocale);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (!page && !error) {
    return (
      <AdminListPage title={t.adminPages} backHref="/admin/cms/pages">
        <p className="text-sm text-muted">{t.loading}</p>
      </AdminListPage>
    );
  }

  return (
    <AdminListPage
      title={page?.key ?? t.adminPages}
      accent="cms"
      backHref="/admin/cms/pages"
      subtitle={`${page?.type ?? ""} · ${page?.audience ?? ""}`}
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["nl", "en"] as const).map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => {
              setEditLocale(code);
              setPreview(false);
            }}
            className={`rounded-full px-3 py-1.5 text-xs font-extrabold uppercase ${
              editLocale === code ? "bg-brand text-white" : "bg-mist text-navy"
            }`}
          >
            {code}
          </button>
        ))}
        <span className="text-xs text-muted">rev {revision}</span>
        {page && !page.archived && (
          <button type="button" onClick={() => void onArchive()} className="ml-auto text-xs font-bold text-red-600">
            {uiLocale === "en" ? "Archive" : "Archiveren"}
          </button>
        )}
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSaveDraft()}
          className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold text-navy disabled:opacity-60"
          data-testid="cms-save-draft"
        >
          {t.cmsSaveDraft}
        </button>
        <button
          type="button"
          onClick={() => void onPreview()}
          className="rounded-xl border border-blue-100 px-4 py-2 text-sm font-bold text-navy"
          data-testid="cms-preview"
        >
          {t.cmsPreview}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onPublish()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
          data-testid="cms-publish"
        >
          {t.cmsPublish}
        </button>
        {preview && (
          <>
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${viewport === "desktop" ? "bg-navy text-white" : "bg-mist"}`}
            >
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${viewport === "mobile" ? "bg-navy text-white" : "bg-mist"}`}
            >
              Mobile
            </button>
          </>
        )}
        {slug && (
          <Link href={`/pagina/${slug}`} className="rounded-xl px-3 py-2 text-sm font-bold text-brand hover:underline">
            /pagina/{slug}
          </Link>
        )}
      </div>

      {page && LEGAL_TYPES.has(page.type) && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 p-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-extrabold text-navy">Legal version</span>
            <input
              value={legalVersion}
              onChange={(e) => setLegalVersion(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2"
              placeholder="2026-10-01"
            />
          </label>
          <label className="block text-sm">
            <span className="font-extrabold text-navy">Effective date</span>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-amber-200 px-3 py-2"
            />
          </label>
        </div>
      )}

      {preview ? (
        <div
          className={`mx-auto rounded-2xl border border-blue-100 bg-white p-6 ${
            viewport === "mobile" ? "max-w-sm" : "max-w-3xl"
          }`}
          data-testid="cms-preview-pane"
        >
          <p className="mb-2 text-xs font-extrabold uppercase text-amber-700">Preview · noindex · no-store</p>
          <h1 className="text-3xl font-black text-navy">{content.title}</h1>
          <div className="mt-6">
            <RichTextView doc={content.body} />
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          <label className="block text-sm">
            <span className="font-extrabold text-navy">Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-extrabold text-navy">Title</span>
            <input
              value={content.title}
              onChange={(e) => setContent((c) => ({ ...c, title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-extrabold text-navy">SEO title</span>
            <input
              value={content.seo_title ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, seo_title: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-extrabold text-navy">SEO description</span>
            <textarea
              value={content.seo_description ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, seo_description: e.target.value }))}
              rows={2}
              className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2"
            />
          </label>
          <RichTextEditor
            label="Body"
            value={content.body}
            onChange={(body) => setContent((c) => ({ ...c, body }))}
          />
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-base font-extrabold text-navy">
          {uiLocale === "en" ? "Revisions" : "Revisies"}
        </h3>
        <ul className="mt-3 divide-y divide-blue-50 rounded-2xl border border-blue-100">
          {revisions.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
              <div>
                <span className="font-bold text-navy">#{r.number}</span>
                <span className="ml-2 text-muted">{r.published_at}</span>
                {r.legal_version && (
                  <span className="ml-2 text-xs font-bold text-amber-700">v{r.legal_version}</span>
                )}
                {r.restored_from != null && (
                  <span className="ml-2 text-xs text-muted">← #{r.restored_from}</span>
                )}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onRestore(r.id)}
                className="font-extrabold text-brand hover:underline disabled:opacity-60"
              >
                {uiLocale === "en" ? "Restore" : "Herstellen"}
              </button>
            </li>
          ))}
          {revisions.length === 0 && <li className="px-4 py-6 text-center text-muted">{t.empty}</li>}
        </ul>
      </div>
    </AdminListPage>
  );
}
