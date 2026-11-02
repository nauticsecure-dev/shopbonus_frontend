"use client";

import { createPortal } from "react-dom";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from "react";
import {
  fetchAdminHomepage,
  fetchHomepageContent,
  fetchHomepageVersions,
  isSuperAdmin,
  publishHomepage,
  requestHomepageAiSuggest,
  restoreHomepageVersion,
  saveHomepageDraft,
} from "@/lib/homepage";
import {
  mergeHomepageContent,
  type HomepageContent,
} from "@/lib/homepageDefaults";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import HomepageCmsControls from "./HomepageCmsControls";
import { confirmPassword } from "@/lib/profile";
import { ApiError } from "@/lib/api";

const CMS_LABELS: Record<string, string> = {
  "CMS laden mislukt": "Could not load CMS",
  "Opslaan mislukt": "Save failed",
  "Gepubliceerd — live homepage bijgewerkt": "Published — live homepage updated",
  "Publiceren mislukt": "Publication failed",
  "Voorbeeld van concept (niet live)": "Draft preview (not live)",
  "Geen eerdere versie gevonden": "No earlier version found",
  "Herstellen mislukt": "Restore failed",
  "Geen AI-suggestie beschikbaar (goedkeuring blijft verplicht)": "No AI suggestion available (approval required)",
  "AI-suggesties zijn uitgeschakeld of niet geconfigureerd": "AI suggestions are disabled or not configured",
  "AI-suggestie mislukt": "AI suggestion failed",
  "Planning opgeslagen in concept.": "Schedule saved in draft.",
  "Planning opslaan mislukt": "Could not save schedule",
  "Voorbeeldmodus": "Preview mode",
  "Homepage bewerken": "Edit homepage",
  " · niet-opgeslagen wijzigingen": " · unsaved changes",
  " · opslaan…": " · saving…",
  "AI-suggestie (goedkeuring vereist)": "AI suggestion (approval required)",
  "Overnehmen": "Apply suggestion",
  "Afwijzen": "Reject",
  "Toepassen": "Apply",
  "Sluiten": "Close"
};
function cmsLabel(locale: string, nl: string) { return locale === "en" ? CMS_LABELS[nl] ?? nl : nl; }

const SECTION_KEYS = [
  "hero",
  "search",
  "popular_webshops",
  "how_it_works",
  "discount_codes",
  "wallet_preview",
  "benefits",
  "cta_band",
  "faq_teaser",
] as const;

type CmsMode = "live" | "edit" | "preview";

type InlineCmsContextValue = {
  canEdit: boolean;
  mode: CmsMode;
  content: HomepageContent;
  setMode: (m: CmsMode) => void;
  draftRevision: number | null;
  dirty: boolean;
  saving: boolean;
  message: string | null;
  needsPassword: boolean;
  requestPasswordConfirmation: () => void;
  dismissPasswordConfirmation: () => void;
  confirmRecentPassword: (password: string) => Promise<boolean>;
  updateField: (path: string, value: unknown) => void;
  saveDraft: () => Promise<boolean>;
  publish: () => Promise<void>;
  cancel: () => void;
  enterPreview: () => void;
  restoreVersion: (id: string) => Promise<void>;
  improveWithAi: (path: string, intent?: "stronger" | "shorter" | "cta" | "seo") => Promise<string | null>;
};

const InlineCmsContext = createContext<InlineCmsContextValue | null>(null);

function setByPath(obj: HomepageContent, path: string, value: unknown): HomepageContent {
  const parts = path.split(".");
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur: Record<string, unknown> = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    if (typeof next !== "object" || next === null) {
      cur[key] = {};
    } else {
      cur[key] = Array.isArray(next) ? [...next] : { ...(next as object) };
    }
    cur = cur[key] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
  return clone as unknown as HomepageContent;
}

function getByPath(obj: HomepageContent, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function InlineCmsProvider({
  initialContent,
  children,
}: {
  initialContent: HomepageContent;
  children: ReactNode;
}) {
  const { session, ready } = useSession();
  const { locale } = useLocale();
  const canEdit = ready && isSuperAdmin(session?.user.roles);
  const [mode, setMode] = useState<CmsMode>("live");
  const [liveContent, setLiveContent] = useState(initialContent);
  const operation = useRef(false);
  const editGeneration = useRef(0);
  const editing = canEdit && mode !== "live";
  const [content, setContent] = useState(initialContent);
  const [editorLocale, setEditorLocale] = useState<string | null>(null);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const requestPasswordConfirmation = useCallback(() => setNeedsPassword(true), []);
  const dismissPasswordConfirmation = useCallback(() => setNeedsPassword(false), []);
  const confirmRecentPassword = useCallback(async (password: string) => {
    if (!canEdit) return false;
    try {
      await confirmPassword(password, locale);
      setNeedsPassword(false);
      setMessage(locale === "en" ? "Password confirmed. Retry your action." : "Wachtwoord bevestigd. Probeer je actie opnieuw.");
      return true;
    } catch (error) {
      setMessage(error instanceof ApiError ? error.message : (locale === "en" ? "Password confirmation failed" : "Wachtwoord bevestigen mislukt"));
      return false;
    }
  }, [canEdit, locale]);
  useEffect(() => {
    let cancelled = false;
    void fetchHomepageContent(locale).then((published) => {
      if (!cancelled) setLiveContent(published);
    }).catch(() => {
      // The server snapshot remains available if the refresh fails.
    });
    return () => { cancelled = true; };
  }, [locale, initialContent]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    void fetchAdminHomepage(locale)
      .then((state) => {
        if (cancelled) return;
        const draft = mergeHomepageContent(state.draft ?? state.published ?? null, locale as "nl" | "en");
        setEditorLocale(locale);
        setContent(draft);
        setDraftRevision(state.draft_revision);
        setDirty(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError ? err.message : cmsLabel(locale, "CMS laden mislukt"));
      });
    return () => {
      cancelled = true;
    };
  }, [editing, locale]);

  const updateField = useCallback((path: string, value: unknown) => {
    editGeneration.current += 1;
    setContent((prev) => setByPath(prev, path, value));
    setDirty(true);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!canEdit || editorLocale !== locale || draftRevision == null || operation.current) return false;
    operation.current = true;
    const generation = editGeneration.current;
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveHomepageDraft({ locale, revision: draftRevision, content });
      setDraftRevision(res.draft_revision);
      if (generation !== editGeneration.current) return false;
      setDirty(false);
      setMessage(locale === "en" ? "Draft saved" : "Concept opgeslagen");
      return true;
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") setNeedsPassword(true);
      setMessage(err instanceof ApiError ? err.message : cmsLabel(locale, "Opslaan mislukt"));
      return false;
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }, [content, draftRevision, locale, canEdit, editorLocale]);

  // Draft autosave while editing (debounced).
  useEffect(() => {
    if (mode !== "edit" || !dirty || draftRevision == null || saving) return;
    const t = window.setTimeout(() => {
      void saveDraft();
    }, 2500);
    return () => window.clearTimeout(t);
  }, [mode, dirty, draftRevision, saving, content, saveDraft]);

  const publish = useCallback(async () => {
    if (!canEdit || editorLocale !== locale || operation.current || draftRevision == null) return;
    setMessage(null);
    try {
      if (dirty && !(await saveDraft())) return;
      operation.current = true;
      setSaving(true);
      await publishHomepage(locale);
      setMode("live");
      setMessage(cmsLabel(locale, "Gepubliceerd — live homepage bijgewerkt"));
      // Soft refresh so RSC picks up cache invalidation.
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") setNeedsPassword(true);
      setMessage(err instanceof ApiError ? err.message : cmsLabel(locale, "Publiceren mislukt"));
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }, [dirty, locale, saveDraft, draftRevision, canEdit, editorLocale]);

  const cancel = useCallback(() => {
    setContent(liveContent);
    setDirty(false);
    setMode("live");
    setMessage(null);
  }, [liveContent]);

  const enterPreview = useCallback(() => {
    setMode("preview");
    setMessage(cmsLabel(locale, "Voorbeeld van concept (niet live)"));
  }, [locale]);

  const restoreVersion = useCallback(async (id: string) => {
    if (operation.current || !window.confirm(locale === "en" ? "Publish this historical version immediately? Unsaved changes will be discarded." : "Deze historische versie direct publiceren? Niet-opgeslagen wijzigingen gaan verloren.")) return;
    operation.current = true;
    setSaving(true);
    try {
      const versions = await fetchHomepageVersions(locale);
      const prev = versions.find((v) => v.locale === locale && v.id === id);
      if (!prev) {
        setMessage(cmsLabel(locale, "Geen eerdere versie gevonden"));
        return;
      }
      await restoreHomepageVersion(prev.id, locale);
      setMessage(locale === "en" ? `Version ${prev.number} restored as a new publication` : `Versie ${prev.number} hersteld als nieuwe publicatie`);
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") setNeedsPassword(true);
      setMessage(err instanceof ApiError ? err.message : cmsLabel(locale, "Herstellen mislukt"));
    } finally {
      operation.current = false;
      setSaving(false);
    }
  }, [locale]);

  const improveWithAi = useCallback(
    async (path: string, intent: "stronger" | "shorter" | "cta" | "seo" = "stronger") => {
      const text = String(getByPath(content, path) ?? "");
      try {
        const res = await requestHomepageAiSuggest({ locale, field: path, text, intent });
        if (!res.suggestion) {
          setMessage(cmsLabel(locale, "Geen AI-suggestie beschikbaar (goedkeuring blijft verplicht)"));
          return null;
        }
        return res.suggestion;
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          setMessage(cmsLabel(locale, "AI-suggesties zijn uitgeschakeld of niet geconfigureerd"));
          return null;
        }
        setMessage(err instanceof ApiError ? err.message : cmsLabel(locale, "AI-suggestie mislukt"));
        return null;
      }
    },
    [content, locale]
  );

  const value = useMemo<InlineCmsContextValue>(
    () => ({
      canEdit,
      mode,
      content: !canEdit || mode === "live" ? liveContent : editorLocale === locale ? content : mergeHomepageContent(null, locale),
      setMode,
      draftRevision: editorLocale === locale ? draftRevision : null,
      dirty,
      saving,
      message,
      needsPassword,
      requestPasswordConfirmation,
      dismissPasswordConfirmation,
      confirmRecentPassword,
      updateField,
      saveDraft,
      publish,
      cancel,
      enterPreview,
      restoreVersion,
      improveWithAi,
    }),
    [
      canEdit,
      editorLocale,
      locale,
      mode,
      liveContent,
      content,
      draftRevision,
      dirty,
      saving,
      message,
      needsPassword,
      requestPasswordConfirmation,
      dismissPasswordConfirmation,
      confirmRecentPassword,
      updateField,
      saveDraft,
      publish,
      cancel,
      enterPreview,
      restoreVersion,
      improveWithAi,
    ]
  );

  return <InlineCmsContext.Provider value={value}>{children}</InlineCmsContext.Provider>;
}

export function useInlineCms() {
  const ctx = useContext(InlineCmsContext);
  if (!ctx) throw new Error("useInlineCms requires InlineCmsProvider");
  return ctx;
}

export function CmsToolbar() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [panel, setPanel] = useState<"none" | "sections" | "seo" | "schedule" | "history">("none");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchHomepageVersions>>>([]);
  const [versionId, setVersionId] = useState("");
  useEffect(() => {
    if (!cms.canEdit || panel !== "history") return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setVersionId(""); });
    void fetchHomepageVersions(locale).then((rows) => { if (!cancelled) setVersions(rows.filter(row => row.locale === locale)); }).catch(() => { if (!cancelled) setVersions([]); });
    return () => { cancelled = true; };
  }, [cms.canEdit, panel, locale]);
  const localDate = (value?: string | null) => value ? new Date(new Date(value).getTime() - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  const publishAt = localDate(cms.content.schedule?.publish_at);
  const unpublishAt = localDate(cms.content.schedule?.unpublish_at);

  if (!cms.canEdit) return null;

  if (cms.mode === "live") {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => cms.setMode("edit")}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand"
          data-testid="cms-edit-homepage"
        >
          {locale === "en" ? "Edit homepage" : "Homepage bewerken"}
        </button>
      </div>
    );
  }

  async function applySchedule() {
    try {
      if (cms.dirty && !(await cms.saveDraft())) return;

      window.alert(cmsLabel(locale, "Planning opgeslagen in concept."));
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : cmsLabel(locale, "Planning opslaan mislukt"));
    }
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-100 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(10,27,63,0.35)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <p className="font-extrabold text-navy">
              {cms.mode === "preview" ? cmsLabel(locale, "Voorbeeldmodus") : cmsLabel(locale, "Homepage bewerken")}
              {cms.dirty ? cmsLabel(locale, " · niet-opgeslagen wijzigingen") : ""}
              {cms.saving ? cmsLabel(locale, " · opslaan…") : ""}
            </p>
            {cms.message && <p role="status" className="text-muted">{cms.message}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPanel(panel === "sections" ? "none" : "sections")}
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-navy"
            >
              {locale === "en" ? "Sections" : "Secties"}
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "seo" ? "none" : "seo")}
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-navy"
            >
              SEO
            </button>
            <button
              type="button"
              onClick={() => setPanel(panel === "schedule" ? "none" : "schedule")}
              className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm font-bold text-navy"
            >
              {locale === "en" ? "Schedule" : "Planning"}
            </button>
            <button
              type="button"
              disabled={cms.saving || cms.draftRevision == null || !cms.dirty}
              onClick={() => void cms.saveDraft()}
              className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-navy disabled:opacity-40"
              data-testid="cms-save-draft"
            >
              {locale === "en" ? "Save draft" : "Concept opslaan"}
            </button>
            <button
              type="button"
              disabled={cms.saving || cms.draftRevision == null}
              onClick={() => cms.enterPreview()}
              className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-navy"
              data-testid="cms-preview"
            >
              {locale === "en" ? "Preview" : "Voorbeeld"}
            </button>
            <button
              type="button"
              disabled={cms.saving}
              onClick={() => void cms.publish()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
              data-testid="cms-publish"
            >
              {locale === "en" ? "Publish" : "Publiceren"}
            </button>
            <button
              type="button"
              disabled={cms.saving}
              onClick={() => setPanel(panel === "history" ? "none" : "history")}
              className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900"
              data-testid="cms-restore"
            >
              {locale === "en" ? "Restore" : "Herstellen"}
            </button>
            <button
              type="button"
              disabled={cms.saving}
              onClick={() => cms.cancel()}
              className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy"
              data-testid="cms-cancel"
            >
              {locale === "en" ? "Cancel" : "Annuleren"}
            </button>
          </div>
        </div>

        {cms.needsPassword && createPortal(<div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/40 p-4" role="dialog" aria-modal="true" aria-labelledby="cms-password-title"><form className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-xl" onSubmit={async event => { event.preventDefault(); setConfirming(true); try { await cms.confirmRecentPassword(password); setPassword(""); } finally { setConfirming(false); } }}><h2 id="cms-password-title" className="text-lg font-bold text-navy">{locale === "en" ? "Confirm your password" : "Bevestig je wachtwoord"}</h2><p className="text-sm text-muted">{locale === "en" ? "Confirm your password before changing homepage content. Then retry your action." : "Bevestig je wachtwoord voordat je de homepage wijzigt. Probeer daarna je actie opnieuw."}</p><label className="block text-sm font-semibold">{locale === "en" ? "Current password" : "Huidig wachtwoord"}<input required autoComplete="current-password" autoFocus type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-blue-200 p-3" /></label>{cms.message && <p role="status" className="text-sm text-muted">{cms.message}</p>}<div className="flex gap-3"><button disabled={confirming} type="submit" className="rounded-xl bg-brand px-4 py-2 font-bold text-white">{locale === "en" ? "Confirm password" : "Wachtwoord bevestigen"}</button><button disabled={confirming} type="button" onClick={() => { setPassword(""); cms.dismissPasswordConfirmation(); }}>{locale === "en" ? "Cancel" : "Annuleren"}</button></div></form></div>, document.body)}
        <HomepageCmsControls />

        {panel === "history" && <div className="max-h-48 overflow-auto rounded-xl border p-3"><label>{locale === "en" ? "Published version" : "Gepubliceerde versie"}<select aria-label="Published version" value={versionId} onChange={e => setVersionId(e.target.value)}><option value="">{locale === "en" ? "Choose a version" : "Kies een versie"}</option>{versions.map(v => <option key={v.id} value={v.id}>{v.number} · {new Date(v.published_at).toLocaleString(locale)} · {v.locale}</option>)}</select></label>{versions.find(v => v.id === versionId)?.content && <details><summary>{locale === "en" ? "Inspect selected content" : "Geselecteerde inhoud bekijken"}</summary><pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(versions.find(v => v.id === versionId)?.content, null, 2)}</pre></details>}<button disabled={!versionId || cms.saving} onClick={() => void cms.restoreVersion(versionId)}>{locale === "en" ? "Restore selected version" : "Geselecteerde versie herstellen"}</button></div>}

        {panel === "sections" && cms.mode === "edit" && (
          <div className="flex flex-wrap gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            {SECTION_KEYS.map((key) => {
              const on = cms.content.section_visibility[key] !== false;
              return (
                <label key={key} className="flex items-center gap-2 text-xs font-bold text-navy">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      cms.updateField("section_visibility", {
                        ...cms.content.section_visibility,
                        [key]: e.target.checked,
                      })
                    }
                  />
                  {key}
                </label>
              );
            })}
          </div>
        )}

        {panel === "seo" && cms.mode === "edit" && (
          <div className="grid gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-3 sm:grid-cols-2">
            <input
              value={cms.content.seo_title}
              onChange={(e) => cms.updateField("seo_title", e.target.value.slice(0, 70))}
              placeholder={locale === "en" ? "SEO title" : "SEO-titel"}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
            <input
              value={cms.content.seo_description}
              onChange={(e) => cms.updateField("seo_description", e.target.value.slice(0, 160))}
              placeholder={locale === "en" ? "SEO description" : "SEO-beschrijving"}
              className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
            />
          </div>
        )}

        {panel === "schedule" && cms.mode === "edit" && (
          <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-blue-100 bg-blue-50/60 p-3">
            <label className="text-xs font-bold text-navy">
              {locale === "en" ? "Publish at" : "Publiceren op"}
              <input
                type="datetime-local"
                value={publishAt}
                onChange={(e) => cms.updateField("schedule.publish_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="mt-1 block rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-bold text-navy">
              {locale === "en" ? "Unpublish at" : "Verbergen op"}
              <input
                type="datetime-local"
                value={unpublishAt}
                onChange={(e) => cms.updateField("schedule.unpublish_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
                className="mt-1 block rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => void applySchedule()}
              className="rounded-xl bg-navy px-4 py-2 text-sm font-bold text-white"
            >
              {locale === "en" ? "Save schedule" : "Planning opslaan"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function EditableText({
  path,
  as: Tag = "span",
  className,
  multiline = false,
}: {
  path: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  multiline?: boolean;
}) {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const raw = getByPath(cms.content, path);
  const value = typeof raw === "string" ? raw : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => { queueMicrotask(() => setDraft(value)); }, [value]);

  if (!cms.canEdit || cms.mode === "live" || cms.mode === "preview") {
    if (Tag === "h1" && value.includes("\n")) {
      const [a, b] = value.split("\n");
      return (
        <h1 className={className}>
          {a}
          {b ? (
            <>
              <br />
              <span className="text-brand">{b}</span>
            </>
          ) : null}
        </h1>
      );
    }
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <span className="relative inline-block max-w-full">
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setAiSuggestion(null);
          setOpen(true);
        }}
        className={`${className ?? ""} cursor-text rounded-md outline outline-2 outline-dashed outline-brand/40 hover:outline-brand`}
        data-cms-edit={path}
      >
        {Tag === "h1" && value.includes("\n") ? (
          <>
            {value.split("\n")[0]}
            <br />
            <span className="text-brand">{value.split("\n")[1]}</span>
          </>
        ) : (
          value
        )}
        <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white">
          ✎
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-40 mt-2 w-[min(100vw-2rem,28rem)] rounded-2xl border border-blue-100 bg-white p-4 shadow-xl">
          {multiline ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-blue-100 p-3 text-sm text-navy focus:border-brand focus:outline-none"
            />
          ) : (
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-xl border border-blue-100 p-3 text-sm text-navy focus:border-brand focus:outline-none"
            />
          )}
          {aiSuggestion && (
            <div className="mt-3 rounded-xl bg-blue-50 p-3 text-sm">
              <p className="font-bold text-navy">{cmsLabel(locale, "AI-suggestie (goedkeuring vereist)")}</p>
              <p className="mt-1 text-muted">{aiSuggestion}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
                  onClick={() => {
                    setDraft(aiSuggestion);
                    setAiSuggestion(null);
                  }}
                >
                  {cmsLabel(locale, "Overnehmen")}
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
                  onClick={() => setAiSuggestion(null)}
                >
                  {cmsLabel(locale, "Afwijzen")}
                </button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => {
                cms.updateField(path, draft);
                setOpen(false);
              }}
            >
              {cmsLabel(locale, "Toepassen")}
            </button>
            <button
              type="button"
              className="rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-bold text-navy"
              onClick={() => void cms.improveWithAi(path).then((s) => s && setAiSuggestion(s))}
            >
              {locale === "en" ? "Improve with AI" : "Verbeteren met AI"}
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
              onClick={() => setOpen(false)}
            >
              {cmsLabel(locale, "Sluiten")}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
