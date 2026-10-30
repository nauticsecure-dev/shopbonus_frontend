"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAdminMerchantLanding,
  fetchMerchantLandingVersions,
  isSuperAdmin,
  publishMerchantLanding,
  requestMerchantLandingAiSuggest,
  restoreMerchantLandingVersion,
  saveMerchantLandingDraft,
} from "@/lib/merchantLanding";
import {
  mergeMerchantLandingContent,
  type MerchantLandingContent,
} from "@/lib/merchantLandingDefaults";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { ApiError } from "@/lib/api";

type CmsMode = "live" | "edit" | "preview";

type InlineCmsContextValue = {
  canEdit: boolean;
  mode: CmsMode;
  content: MerchantLandingContent;
  setMode: (m: CmsMode) => void;
  draftRevision: number | null;
  dirty: boolean;
  saving: boolean;
  message: string | null;
  updateField: (path: string, value: unknown) => void;
  saveDraft: () => Promise<void>;
  publish: () => Promise<void>;
  cancel: () => void;
  enterPreview: () => void;
  restoreLatest: () => Promise<void>;
  improveWithAi: (path: string, intent?: "stronger" | "shorter" | "cta" | "seo") => Promise<string | null>;
};

const InlineCmsContext = createContext<InlineCmsContextValue | null>(null);

function setByPath(obj: MerchantLandingContent, path: string, value: unknown): MerchantLandingContent {
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
  return clone as unknown as MerchantLandingContent;
}

function getByPath(obj: MerchantLandingContent, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

export function InlineCmsProvider({
  initialContent,
  children,
}: {
  initialContent: MerchantLandingContent;
  children: ReactNode;
}) {
  const { session, ready } = useSession();
  const { locale } = useLocale();
  const canEdit = ready && isSuperAdmin(session?.user.roles);
  const [mode, setMode] = useState<CmsMode>("live");
  const [liveContent] = useState(initialContent);
  const [content, setContent] = useState(initialContent);
  const [draftRevision, setDraftRevision] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [baseline, setBaseline] = useState(initialContent);

  useEffect(() => {
    if (!canEdit || mode === "live") return;
    let cancelled = false;
    void fetchAdminMerchantLanding(locale)
      .then((state) => {
        if (cancelled) return;
        const draft = mergeMerchantLandingContent(state.draft ?? state.published ?? null, locale as "nl" | "en");
        setContent(draft);
        setBaseline(draft);
        setDraftRevision(state.draft_revision);
        setDirty(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setMessage(err instanceof ApiError ? err.message : "CMS laden mislukt");
      });
    return () => {
      cancelled = true;
    };
  }, [canEdit, mode, locale]);

  const updateField = useCallback((path: string, value: unknown) => {
    setContent((prev) => setByPath(prev, path, value));
    setDirty(true);
  }, []);

  const saveDraft = useCallback(async () => {
    if (draftRevision == null) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await saveMerchantLandingDraft({ locale, revision: draftRevision, content });
      setDraftRevision(res.draft_revision);
      setBaseline(content);
      setDirty(false);
      setMessage("Concept opgeslagen");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }, [content, draftRevision, locale]);

  const publish = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      if (dirty) await saveDraft();
      await publishMerchantLanding(locale);
      setMode("live");
      setMessage("Gepubliceerd — live pagina bijgewerkt");
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Publiceren mislukt");
    } finally {
      setSaving(false);
    }
  }, [dirty, locale, saveDraft]);

  const cancel = useCallback(() => {
    setContent(baseline);
    setDirty(false);
    setMode("live");
    setMessage(null);
  }, [baseline]);

  const enterPreview = useCallback(() => {
    setMode("preview");
    setMessage("Voorbeeld van concept (niet live)");
  }, []);

  const restoreLatest = useCallback(async () => {
    setSaving(true);
    try {
      const versions = await fetchMerchantLandingVersions(locale);
      const prev = versions.find((v) => v.locale === locale);
      if (!prev) {
        setMessage("Geen eerdere versie gevonden");
        return;
      }
      await restoreMerchantLandingVersion(prev.id, locale);
      setMessage(`Versie ${prev.number} hersteld als nieuwe publicatie`);
      window.location.reload();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Herstellen mislukt");
    } finally {
      setSaving(false);
    }
  }, [locale]);

  const improveWithAi = useCallback(
    async (path: string, intent: "stronger" | "shorter" | "cta" | "seo" = "stronger") => {
      const text = String(getByPath(content, path) ?? "");
      try {
        const res = await requestMerchantLandingAiSuggest({ locale, field: path, text, intent });
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
      mode,
      content: mode === "live" ? liveContent : content,
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
      restoreLatest,
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
      restoreLatest,
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
          data-testid="cms-edit-voor-webshops"
        >
          Edit page
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-blue-100 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_-12px_rgba(10,27,63,0.35)] backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <div className="text-sm">
          <p className="font-extrabold text-navy">
            {cms.mode === "preview" ? "Voorbeeldmodus" : "Pagina bewerken"}
            {cms.dirty ? " · niet-opgeslagen wijzigingen" : ""}
          </p>
          {cms.message && <p className="text-muted">{cms.message}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
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
            Preview
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
            onClick={() => void cms.restoreLatest()}
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900"
          >
            Restore
          </button>
          <button
            type="button"
            disabled={cms.saving}
            onClick={() => cms.cancel()}
            className="rounded-xl px-4 py-2 text-sm font-bold text-muted hover:text-navy"
          >
            Cancel
          </button>
        </div>
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
  const raw = getByPath(cms.content, path);
  const value = typeof raw === "string" ? raw : "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  useEffect(() => setDraft(value), [value]);

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
