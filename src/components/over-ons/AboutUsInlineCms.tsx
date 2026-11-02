"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAdminAboutUs,
  fetchAboutUsServer,
  isSuperAdmin,
  publishAboutUs,
  requestAboutUsAiSuggest,
  restoreAboutUsVersion,
  saveAboutUsDraft,
} from "@/lib/aboutUs";
import { mergeAboutUsContent, type AboutUsContent } from "@/lib/aboutUsDefaults";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { apiRequest, ApiError } from "@/lib/api";
import type { Locale } from "@/types/locale";
import { AboutUsCmsControls } from "./AboutUsCmsControls";
import { useRouter } from "next/navigation";

type CmsMode = "live" | "edit" | "preview";

type InlineCmsContextValue = {
  canEdit: boolean;
  mode: CmsMode;
  content: AboutUsContent;
  available: boolean;
  loading: boolean;
  setMode: (m: CmsMode) => void;
  draftRevision: number | null;
  dirty: boolean;
  saving: boolean;
  message: string | null;
  updateField: (path: string, value: unknown) => void;
  saveDraft: () => Promise<number | null>;
  publish: () => Promise<void>;
  cancel: () => void;
  enterPreview: () => void;
  restoreVersion: (id: string) => Promise<void>;
  schedulePublication: (dueAt: string) => Promise<void>;
  improveWithAi: (path: string, intent?: "stronger" | "shorter" | "cta" | "seo") => Promise<string | null>;
};

const InlineCmsContext = createContext<InlineCmsContextValue | null>(null);

function setByPath(obj: AboutUsContent, path: string, value: unknown): AboutUsContent {
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
  return clone as unknown as AboutUsContent;
}

function getByPath(obj: AboutUsContent, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function InlineCmsProvider({
  initialContent,
  initialLocale,
  children,
}: {
  initialContent: AboutUsContent | null;
  initialLocale: Locale;
  children: ReactNode;
}) {
  const { locale } = useLocale();
  return <CmsSession key={locale} initialContent={locale === initialLocale ? initialContent : null}>{children}</CmsSession>;
}

function CmsSession({ initialContent, children }: { initialContent: AboutUsContent | null; children: ReactNode }) {
  const router = useRouter();
  const { session, ready } = useSession();
  const { locale } = useLocale();
  const canEdit = ready && isSuperAdmin(session?.user.roles);
  const [mode, setMode] = useState<CmsMode>("live");
  const [liveContent, setLiveContent] = useState(initialContent);
  const [content, setContent] = useState(initialContent ?? mergeAboutUsContent(null, locale));
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  const editing = mode !== "live";
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let cancelled = false;
    void fetchAboutUsServer(locale).then((published) => { if (!cancelled) setLiveContent(published); });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    if (!canEdit || !editing) return;
    let cancelled = false;
    void fetchAdminAboutUs(locale)
      .then((state) => {
        if (cancelled) return;
        const draft = mergeAboutUsContent(state.draft ?? state.published ?? null, locale as "nl" | "en");
        setContent(draft);
        setDraftRevision(state.draft_revision);
        setDirty(false);
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError ? err.message : "CMS laden mislukt");
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, editing, locale]);

  const updateField = useCallback((path: string, value: unknown) => {
    if (!canEdit || !loaded || busy.current || mode !== "edit") return;
    setContent((prev) => setByPath(prev, path, value));
    setDirty(true);
  }, [canEdit, loaded, mode]);

  const persist = useCallback(async () => {
    if (!canEdit || !loaded || draftRevision == null) throw new Error("Laad het concept opnieuw voordat je opslaat.");
      // Never send authoritative commission percentages in draft payload
      const { consumer_percent: _c, platform_percent: _p, ...revenueRest } = content.revenue_model;
      const payload: AboutUsContent = {
        ...content,
        revenue_model: revenueRest as AboutUsContent["revenue_model"],
      };
      // Resolved URLs are display-only; the backend accepts asset references.
      const clean = JSON.parse(JSON.stringify(payload, (key, value) => key.endsWith("_url") ? undefined : value)) as AboutUsContent;
      const res = await saveAboutUsDraft({ locale, revision: draftRevision, content: clean });
      if (!mounted.current) throw new Error("Language changed; review the draft again.");
      setDraftRevision(res.draft_revision);
      setDirty(false);
      return res.draft_revision;
  }, [canEdit, loaded, content, draftRevision, locale]);

  const saveDraft = useCallback(async () => {
    if (busy.current) return null;
    busy.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const revision = await persist();
      setMessage("Concept opgeslagen");
      return revision;
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Opslaan mislukt");
      return null;
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [persist]);

  const publish = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setMessage(null);
    try {
      const revision = await persist();
      await publishAboutUs(locale, revision);
      const published = await fetchAboutUsServer(locale);
      setLiveContent(published);
      setLoaded(false);
      setMode("live");
      setMessage(published ? "Gepubliceerd — live pagina bijgewerkt" : "Publicatie opgeslagen; inhoud momenteel niet beschikbaar of buiten het publicatievenster.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Publiceren mislukt");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [locale, persist, router]);

  const cancel = useCallback(() => {
    if (busy.current) return;
    setContent(liveContent ?? mergeAboutUsContent(null, locale));
    setLoaded(false);
    setDirty(false);
    setMode("live");
    setMessage(null);
  }, [liveContent, locale]);

  const enterPreview = useCallback(() => {
    setMode((previous) => previous === "preview" ? "edit" : "preview");
    setMessage("Voorbeeld van concept (niet live)");
  }, []);

  const restoreVersion = useCallback(async (id: string) => {
    if (!canEdit || !loaded || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await restoreAboutUsVersion(id, locale);
      setLiveContent(await fetchAboutUsServer(locale));
      setLoaded(false);
      setMode("live");
      setMessage("Geselecteerde versie hersteld als nieuwe publicatie");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Herstellen mislukt");
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }, [canEdit, loaded, locale, router]);

  const schedulePublication = useCallback(async (dueAt: string) => {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      const revision = await persist();
      const state = await fetchAdminAboutUs(locale);
      if (!mounted.current) throw new Error("Language changed; review the draft again.");
      await apiRequest({ path: `/api/v1/admin/cms/pages/${encodeURIComponent(state.id)}/schedules`, method: "POST", locale,
        body: { action: "publish", locale, revision, due_at: dueAt } });
      setMode("live");
      setMessage("Publicatie ingepland. De huidige publicatie blijft zichtbaar tot het geplande moment.");
      setLoaded(false);
    } catch (err) { setMessage(err instanceof Error ? err.message : "Inplannen mislukt"); }
    finally { busy.current = false; setSaving(false); }
  }, [persist, locale]);

  const improveWithAi = useCallback(
    async (path: string, intent: "stronger" | "shorter" | "cta" | "seo" = "stronger") => {
      const text = String(getByPath(content, path) ?? "");
      try {
        const res = await requestAboutUsAiSuggest({ locale, field: path, text, intent });
        if (!res.suggestion) {
          setMessage("Geen AI-suggestie beschikbaar (goedkeuring blijft verplicht)");
          return null;
        }
        return res.suggestion;
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          setMessage("AI-suggesties zijn uitgeschakeld of niet geconfigureerd");
          return null;
        }
        setMessage(err instanceof ApiError ? err.message : "AI-suggestie mislukt");
        return null;
      }
    },
    [content, locale]
  );

  const value = useMemo<InlineCmsContextValue>(
    () => ({
      canEdit,
      mode: canEdit ? mode : "live",
      content: !canEdit || mode === "live" ? liveContent ?? mergeAboutUsContent(null, locale, true) : content,
      available: (canEdit && mode !== "live") || liveContent !== null,
      loading: editing && !loaded,
      setMode,
      draftRevision,
      dirty,
      saving,
      message,
      updateField,
      saveDraft,
      publish,
      cancel,
      enterPreview,
      restoreVersion,
      schedulePublication,
      improveWithAi,
    }),
    [
      canEdit,
      mode,
      liveContent,
      content,
      draftRevision,
      dirty,
      saving,
      message,
      updateField,
      saveDraft,
      publish,
      cancel,
      enterPreview,
      restoreVersion,
      schedulePublication,
      editing,
      loaded,
      locale,
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
  if (!cms.canEdit) return null;

  if (cms.mode === "live") {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <button
          type="button"
          onClick={() => cms.setMode("edit")}
          className="rounded-full bg-navy px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-brand"
          data-testid="cms-edit-over-ons"
        >
          Edit page
        </button>
        {cms.message && <p role="status" className="max-w-sm bg-white p-2">{cms.message}</p>}
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-100 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(10,27,63,0.35)] backdrop-blur">
      <AboutUsCmsControls />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-extrabold text-navy">
            {cms.mode === "preview" ? "Voorbeeldmodus" : "Pagina bewerken"}
            {cms.dirty ? " · niet-opgeslagen wijzigingen" : ""}
          </p>
          <p role="status">{cms.loading ? "Concept laden…" : cms.message}</p>
        </div>
        <fieldset disabled={cms.saving || cms.loading} className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={cms.saving || !cms.dirty}
            onClick={() => void cms.saveDraft()}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-navy disabled:opacity-40"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={cms.saving}
            onClick={() => cms.enterPreview()}
            className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-bold text-navy"
          >
            {cms.mode === "preview" ? "Back to edit" : "Preview"}
          </button>
          <button
            type="button"
            disabled={cms.saving}
            onClick={() => void cms.publish()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Publish
          </button>
          <button
            type="button"
            disabled={cms.saving}
            onClick={() => cms.cancel()}
            className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy"
          >
            Cancel
          </button>
        </fieldset>
        {cms.loading && <button type="button" onClick={cms.cancel}>Leave editor</button>}
      </div>
    </div>
  );
}

export function EditableText({
  path,
  as: Tag = "span",
  className,
  multiline = false,
  accentPath,
}: {
  path: string;
  as?: "span" | "h1" | "h2" | "h3" | "p";
  className?: string;
  multiline?: boolean;
  /** Optional path for blue accent suffix rendered after the main heading */
  accentPath?: string;
}) {
  const cms = useInlineCms();
  const raw = getByPath(cms.content, path);
  const value = typeof raw === "string" ? raw : "";
  const accentRaw = accentPath ? getByPath(cms.content, accentPath) : null;
  const accent = typeof accentRaw === "string" ? accentRaw : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const display = (
    <>
      {value}
      {accent ? (
        <>
          {" "}
          <span className="text-brand">{accent}</span>
        </>
      ) : null}
    </>
  );

  if (!cms.canEdit || cms.mode === "live" || cms.mode === "preview" || cms.loading || cms.saving) {
    return <Tag className={className}>{display}</Tag>;
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
        className={`${className ?? ""} cursor-text rounded-md text-left outline outline-2 outline-dashed outline-brand/40 hover:outline-brand`}
        data-cms-edit={path}
      >
        {display}
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
              <p className="font-bold text-navy">AI-suggestie (goedkeuring vereist)</p>
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
                  Overnehmen
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
                  onClick={() => setAiSuggestion(null)}
                >
                  Afwijzen
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
              Toepassen
            </button>
            <button
              type="button"
              className="rounded-lg border border-blue-100 px-3 py-1.5 text-xs font-bold text-navy"
              onClick={() => void cms.improveWithAi(path).then((s) => s && setAiSuggestion(s))}
            >
              Improve with AI
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted"
              onClick={() => setOpen(false)}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
