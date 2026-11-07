"use client";
import ResponsivePreview from "@/components/cms/ResponsivePreview";

import { useState, type ReactNode } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { ApiError } from "@/lib/api";
import {
  isSuperAdmin,
  listCmsPages,
  previewCmsDraft,
  publishCmsLocale,
  saveCmsDraft,
  type CmsPageSummary,
  type PublicCmsPage,
} from "@/lib/cms";
import { emptyPageContent, type CmsPageContent } from "@/lib/richText";
import RichTextEditor from "@/components/cms/RichTextEditor";
import RichTextView from "@/components/cms/RichTextView";

type Mode = "live" | "edit" | "preview";

/**
 * Super Admin inline studio for published /pagina/[slug] pages.
 * Drafts never change the public view until Publish.
 */
export default function PageInlineCms({
  published,
  children,
}: {
  published: PublicCmsPage;
  children: (view: { content: CmsPageContent; mode: Mode }) => ReactNode;
}) {
  const { session, ready } = useSession();
  const { locale, dictionary: t } = useLocale();
  const canEdit = ready && isSuperAdmin(session?.user.roles);
  const [mode, setMode] = useState<Mode>("live");
  const [pageMeta, setPageMeta] = useState<CmsPageSummary | null>(null);
  const [content, setContent] = useState<CmsPageContent>(published.content);
  const [savedContent, setSavedContent] = useState<CmsPageContent>(published.content);
  const [legalVersion, setLegalVersion] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const dirty = JSON.stringify(content) !== JSON.stringify(savedContent);
  const [revision, setRevision] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function enterEdit() {
    setMessage(null);
    try {
      const pages = await listCmsPages({ search: published.key, locale });
      const match =
        pages.find((p) => p.key === published.key) ??
        pages.find((p) => p.locales[locale]?.slug === published.slug) ??
        null;
      if (!match) {
        setMessage(locale === "en" ? "Page not found in studio" : "Pagina niet in studio gevonden");
        return;
      }
      setPageMeta(match);
      const draft = await previewCmsDraft(match.id, locale);
      setContent(draft.content ?? emptyPageContent());
      setSavedContent(draft.content ?? emptyPageContent());
      setRevision(draft.draft_revision);
      setMode("edit");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  }

  async function onSaveDraft() {
    if (!pageMeta || revision == null || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await saveCmsDraft({
        pageId: pageMeta.id,
        locale,
        revision,
        content,
      });
      setRevision(res.draft_revision);
      setSavedContent(content);
      setMessage(t.cmsDraftSaved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setMessage(t.cmsConflict);
      else setMessage(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    if (!pageMeta || busy || revision == null || dirty) return;
    setBusy(true);
    setMessage(null);
    try {
      const legal = ["privacy", "terms", "cookie_policy"].includes(pageMeta.type);
      await publishCmsLocale({
        pageId: pageMeta.id,
        locale,
        revision,
        legal_version: legal ? legalVersion : undefined,
        effective_date: legal ? effectiveDate : undefined,
        approve: legal ? true : undefined,
      });
      setMessage(t.cmsPublished);
      setMode("live");
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return <>{children({ content: published.content, mode: "live" })}</>;
  }

  return (
    <div data-testid="page-inline-cms">
      <div className="sticky top-[72px] z-30 border-b border-blue-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-2 px-4 py-2 sm:px-6">
          {mode === "live" ? (
            <button
              type="button"
              onClick={() => void enterEdit()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white"
              data-testid="cms-edit-page"
            >
              {t.cmsEditPage}
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onSaveDraft()}
                className="rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold text-navy"
                data-testid="cms-save-draft"
              >
                {t.cmsSaveDraft}
              </button>
              <button
                type="button"
                onClick={() => setMode(mode === "preview" ? "edit" : "preview")}
                className="rounded-xl border border-blue-100 px-3 py-2 text-sm font-bold text-navy"
                data-testid="cms-preview"
              >
                {t.cmsPreview}
              </button>
              <button
                type="button"
                disabled={busy || dirty}
                onClick={() => void onPublish()}
                className="rounded-xl bg-brand px-3 py-2 text-sm font-extrabold text-white"
                data-testid="cms-publish"
              >
                {t.cmsPublish}
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("live");
                  setContent(published.content);
                }}
                className="rounded-xl px-3 py-2 text-sm font-bold text-muted"
              >
                {t.cmsCancel}
              </button>

            </>
          )}
          {message && <span className="text-xs font-bold text-navy">{message}</span>}
        </div>
      </div>

      {mode === "edit" ? (
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-6">
          {pageMeta && ["privacy", "terms", "cookie_policy"].includes(pageMeta.type) && <>
            <label className="block text-sm font-bold">{locale === "en" ? "Legal version" : "Juridische versie"}<input className="block rounded-xl border p-2" value={legalVersion} onChange={(e) => setLegalVersion(e.target.value)} /></label>
            <label className="block text-sm font-bold">{locale === "en" ? "Effective date" : "Ingangsdatum"}<input className="block rounded-xl border p-2" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} /></label>
          </>}
          <input
            value={content.title}
            onChange={(e) => setContent((c) => ({ ...c, title: e.target.value }))}
            className="w-full rounded-2xl border border-dashed border-brand/40 bg-mist/40 px-4 py-3 text-3xl font-black text-navy outline-none"
            data-testid="cms-inline-title"
          />
          <RichTextEditor value={content.body} onChange={(body) => setContent((c) => ({ ...c, body }))} />
        </div>
      ) : (
        mode === "preview" ? <ResponsivePreview onExit={() => setMode("edit")}>{children({ content, mode })}</ResponsivePreview> : children({ content, mode })
      )}
    </div>
  );
}

export function PageBody({ content }: { content: CmsPageContent }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-black tracking-tight text-navy sm:text-4xl">{content.title}</h1>
      <div className="mt-6">
        <RichTextView doc={content.body} recipes={content.media_recipes} />
      </div>
    </article>
  );
}
