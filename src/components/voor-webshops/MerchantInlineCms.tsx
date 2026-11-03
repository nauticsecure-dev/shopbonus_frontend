"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { fetchAdminMerchantLanding, fetchMerchantLandingServer, fetchMerchantLandingVersions, isSuperAdmin, publishMerchantLanding, requestMerchantLandingAiSuggest, restoreMerchantLandingVersion, saveMerchantLandingDraft } from "@/lib/merchantLanding";
import { mergeMerchantLandingContent, type MerchantLandingContent } from "@/lib/merchantLandingDefaults";
import { merchantCmsText, merchantCmsError } from "@/i18n/merchantCmsCopy";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { apiRequest } from "@/lib/api";
import { MerchantCmsControls } from "./MerchantCmsControls";

type CmsMode = "live" | "edit" | "preview";
type InlineCmsContextValue = {
  canEdit: boolean; mode: CmsMode; content: MerchantLandingContent;
  setMode: (mode: CmsMode) => void; draftRevision: number | null;
  dirty: boolean; saving: boolean; loading: boolean; message: string | null;
  updateField: (path: string, value: unknown) => void;
  saveDraft: () => Promise<boolean>; publish: () => Promise<void>;
  cancel: () => void; enterPreview: () => void;
  restoreVersion: (id: string) => Promise<void>;
  schedulePublication: (dueAt: string) => Promise<void>;
  improveWithAi: (path: string, intent?: "stronger" | "shorter" | "cta" | "seo") => Promise<string | null>;
};
const InlineCmsContext = createContext<InlineCmsContextValue | null>(null);
function setByPath(obj: MerchantLandingContent, path: string, value: unknown): MerchantLandingContent {
  const clone = structuredClone(obj);
  const keys = path.split(".");
  let current = clone as unknown as Record<string, unknown>;
  for (const key of keys.slice(0, -1)) {
    if (!current[key] || typeof current[key] !== "object") current[key] = {};
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return clone;
}
function getByPath(obj: MerchantLandingContent, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined, obj);
}
export function InlineCmsProvider({ initialContent, children }: { initialContent: MerchantLandingContent; children: ReactNode }) {
  const { session, ready } = useSession();
  const { locale } = useLocale();
  const router = useRouter();
  const canEdit = ready && isSuperAdmin(session?.user.roles);
  const [mode, setMode] = useState<CmsMode>("live");
  const [liveContent, setLiveContent] = useState(initialContent);
  const [content, setContent] = useState(initialContent);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadedLocale, setLoadedLocale] = useState<string | null>(null);
  const busy = useRef(false);
  const snapshot = useRef(content);
  const revision = useRef<number | null>(null);
  const activeLocale = useRef(locale);
  useEffect(() => { activeLocale.current = locale; }, [locale]);
  const editing = canEdit && mode !== "live";
  useEffect(() => { if (!canEdit) queueMicrotask(() => setMode("live")); }, [canEdit]);

  useEffect(() => { queueMicrotask(() => setLiveContent(initialContent)); }, [initialContent]);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setMessage(null); });
    void fetchMerchantLandingServer(locale).then((published) => {
      if (!cancelled) setLiveContent(published);
    }).catch(() => {
      if (!cancelled) setMessage(merchantCmsText(locale, "Published content could not be refreshed. Showing the last approved snapshot."));
    });
    // LocaleProvider persists this cookie too; write synchronously before refreshing metadata.
    document.cookie = "shopbonus-locale=" + locale + "; Path=/; SameSite=Lax; Max-Age=31536000";
    router.refresh();
    return () => { cancelled = true; };
  }, [locale, router]);

  useEffect(() => {
    if (!editing) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) setLoadedLocale(null); });
    revision.current = null;
    void fetchAdminMerchantLanding(locale).then((state) => {
      if (cancelled) return;
      const draft = mergeMerchantLandingContent(state.draft ?? state.published, locale);
      snapshot.current = draft;
      revision.current = state.draft_revision;
      setContent(draft);
      setDraftRevision(state.draft_revision);
      setDirty(false);
      setLoadedLocale(locale);
    }).catch((err) => {
      if (!cancelled) setMessage(merchantCmsError(locale, err, "CMS load failed"));
    });
    return () => { cancelled = true; };
  }, [editing, locale]);

  const updateField = useCallback((path: string, value: unknown) => {
    if (busy.current || loadedLocale !== locale) return;
    snapshot.current = setByPath(snapshot.current, path, value);
    setContent(snapshot.current);
    setDirty(true);
  }, [loadedLocale, locale]);

  const persist = useCallback(async () => {
    if (!canEdit) throw new Error(merchantCmsText(locale, "CMS access is required"));
    if (revision.current == null || loadedLocale !== locale) throw new Error(merchantCmsText(locale, "Wait until the draft has loaded"));
    const captured = snapshot.current;
    const res = await saveMerchantLandingDraft({ locale, revision: revision.current, content: captured });
    if (activeLocale.current !== locale) throw new Error(merchantCmsText(locale, "Language changed during save. Reopen the editor to load this draft."));
    revision.current = res.draft_revision;
    setDraftRevision(res.draft_revision);
    setDirty(snapshot.current !== captured);
    return res.draft_revision;
  }, [canEdit, loadedLocale, locale]);

  const saveDraft = useCallback(async () => {
    if (busy.current) return false;
    busy.current = true;
    setSaving(true);
    try {
      await persist();
      setMessage(merchantCmsText(locale, "Draft saved"));
      return true;
    } catch (err) {
      setMessage(merchantCmsError(locale, err, "Save failed"));
      return false;
    } finally { busy.current = false; setSaving(false); }
  }, [persist, locale]);

  useEffect(() => {
    if (!editing || !dirty || loadedLocale !== locale) return;
    const timer = window.setTimeout(() => { void saveDraft(); }, 1500);
    return () => window.clearTimeout(timer);
  }, [editing, dirty, content, loadedLocale, locale, saveDraft]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  useEffect(() => {
    if (!editing || !dirty) return;
    const navigateAfterSave = (event: MouseEvent) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) return;
      event.preventDefault();
      void saveDraft().then((saved) => {
        if (!saved) return;
        if (destination.origin === window.location.origin) router.push(destination.pathname + destination.search + destination.hash);
        else window.location.assign(destination.href);
      });
    };
    document.addEventListener("click", navigateAfterSave, true);
    return () => document.removeEventListener("click", navigateAfterSave, true);
  }, [editing, dirty, saveDraft, router]);

  const publish = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      // A failed save throws: publishing the previously stored draft is forbidden.
      const savedRevision = await persist();
      await publishMerchantLanding(locale, savedRevision);
      const window = snapshot.current.schedule;
      if ((window?.publish_at && Date.parse(window.publish_at) > Date.now()) || (window?.unpublish_at && Date.parse(window.unpublish_at) <= Date.now())) {
        setMode("preview");
        setMessage(merchantCmsText(locale, "Publication saved. The page is outside its scheduled visibility window."));
        return;
      }
      setLiveContent(await fetchMerchantLandingServer(locale));
      setMode("live");
      setMessage(merchantCmsText(locale, "Published"));
      router.refresh();
    } catch (err) { setMessage(merchantCmsError(locale, err, "Publish failed")); }
    finally { busy.current = false; setSaving(false); }
  }, [locale, persist, router]);

  const cancel = useCallback(() => {
    if (busy.current) return;
    snapshot.current = liveContent;
    setContent(liveContent);
    setDirty(false);
    setMode("live");
    setMessage(null);
  }, [liveContent]);
  const enterPreview = useCallback(() => { setMode((m) => m === "preview" ? "edit" : "preview"); }, []);
  const restoreVersion = useCallback(async (id: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const versions = await fetchMerchantLandingVersions(locale);
      if (!versions.some((v) => v.id === id && v.locale === locale)) throw new Error(merchantCmsText(locale, "Select a version for this language"));
      await restoreMerchantLandingVersion(id, locale);
      setLiveContent(await fetchMerchantLandingServer(locale));
      setDirty(false);
      setMode("live");
      router.refresh();
    } catch (err) { setMessage(merchantCmsError(locale, err, "Restore failed")); }
    finally { busy.current = false; setSaving(false); }
  }, [locale, router]);
  const schedulePublication = useCallback(async (dueAt: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const savedRevision = await persist();
      const state = await fetchAdminMerchantLanding(locale);
      if (activeLocale.current !== locale) throw new Error(merchantCmsText(locale, "Language changed. Review this draft again before scheduling."));
      await apiRequest({
        path: `/api/v1/admin/cms/pages/${encodeURIComponent(state.id)}/schedules`,
        method: "POST", locale,
        body: { action: "publish", locale, revision: savedRevision, due_at: dueAt },
      });
      setMode("live");
      setMessage(merchantCmsText(locale, "Publication scheduled. The current approved page stays live until the scheduled draft is published."));
    } catch (err) { setMessage(merchantCmsError(locale, err, "Scheduling failed")); }
    finally { busy.current = false; setSaving(false); }
  }, [locale, persist]);
  const improveWithAi = useCallback(async (path: string, intent: "stronger" | "shorter" | "cta" | "seo" = "stronger") => {
    try {
      const res = await requestMerchantLandingAiSuggest({ locale, field: path, text: String(getByPath(content, path) ?? ""), intent });
      return res.suggestion || null;
    } catch (err) { setMessage(merchantCmsError(locale, err, "AI suggestion failed")); return null; }
  }, [content, locale]);
  const value = useMemo(() => ({ canEdit, mode, content: mode === "live" ? liveContent : content, setMode, draftRevision, dirty, saving, loading: editing && loadedLocale !== locale, message, updateField, saveDraft, publish, cancel, enterPreview, restoreVersion, schedulePublication, improveWithAi }), [canEdit, mode, liveContent, content, draftRevision, dirty, saving, editing, loadedLocale, locale, message, updateField, saveDraft, publish, cancel, enterPreview, restoreVersion, schedulePublication, improveWithAi]);
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
  const t = (text: string) => merchantCmsText(locale, text);
  if (!cms.canEdit) return null;
  if (cms.mode === "live") return <div className="fixed bottom-5 right-5 z-50"><button type="button" data-testid="cms-edit-voor-webshops" onClick={() => cms.setMode("edit")} className="rounded-full bg-navy px-5 py-3 font-bold text-white shadow-lg">{t("Edit page")}</button>{cms.message && <p role="status" className="max-w-sm bg-white p-2">{cms.message}</p>}</div>;
  return <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white p-3 shadow-lg">
    <MerchantCmsControls />
    <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
      <p role="status">{cms.loading ? t("Loading draft…") : cms.saving ? t("Saving…") : cms.dirty ? t("Unsaved changes") : t("Draft saved")} {cms.message}</p>
      <fieldset disabled={cms.saving || cms.loading} className="flex flex-wrap gap-3 disabled:opacity-50 [&>button]:min-h-11 [&>button]:rounded-xl [&>button]:border [&>button]:border-blue-100 [&>button]:px-4 [&>button]:py-2 [&>button]:text-sm [&>button]:font-bold">
        <button onClick={() => void cms.saveDraft()} disabled={!cms.dirty}>{t("Save draft")}</button>
        <button onClick={cms.enterPreview}>{cms.mode === "preview" ? t("Back to edit") : t("Preview")}</button>
        <button onClick={() => void cms.publish()} className="rounded bg-brand px-4 py-2 text-white">{t("Publish")}</button>
        <button onClick={cms.cancel}>{t("Cancel")}</button>
      </fieldset>
    </div>
  </div>;
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
  const t = (text: string) => merchantCmsText(locale, text);
  const raw = getByPath(cms.content, path);
  const value = typeof raw === "string" ? raw : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);



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
    <div className="relative inline-block max-w-full">
      <Tag>
      <button
        type="button"
        disabled={cms.saving || cms.loading}
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
      </Tag>

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
              <p className="font-bold text-navy">{t("AI suggestion (approval required)")}</p>
              <p className="mt-1 text-muted">{aiSuggestion}</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
                  onClick={() => {
                    setDraft(aiSuggestion);
                    setAiSuggestion(null);
                  }}
                >{t("Accept suggestion")}</button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
                  onClick={() => setAiSuggestion(null)}
                >{t("Reject")}</button>
              </div>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={cms.saving || cms.loading}
              className="rounded-lg bg-navy px-3 py-1.5 text-xs font-bold text-white"
              onClick={() => {
                cms.updateField(path, draft);
                setOpen(false);
              }}
            >{t("Apply")}</button>
            <button
              type="button"
              className="rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-bold text-navy"
              onClick={() => void cms.improveWithAi(path).then((s) => s && setAiSuggestion(s))}
            >{t("Improve with AI")}</button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
              onClick={() => setOpen(false)}
            >{t("Close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
