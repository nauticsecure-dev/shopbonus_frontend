"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import {
  createCmsPage,
  listCmsPages,
  type CmsPageSummary,
  type CmsPageType,
} from "@/lib/cms";
import { emptyPageContent } from "@/lib/richText";
import { useLocale } from "@/i18n/LocaleContext";

const TYPES: CmsPageType[] = [
  "privacy",
  "terms",
  "cookie_policy",
  "help",
  "faq",
  "info",
  "landing",
];

export default function AdminCmsPagesPage() {
  const { locale, dictionary: t } = useLocale();
  const [pages, setPages] = useState<CmsPageSummary[]>([]);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<CmsPageType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newType, setNewType] = useState<CmsPageType>("info");

  const load = async () => {
    setError(null);
    try {
      const data = await listCmsPages({
        search: search.trim() || undefined,
        type: type || undefined,
        locale,
      });
      setPages(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, type]);

  const filtered = useMemo(() => pages, [pages]);

  async function onCreate() {
    if (!newKey.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const key = newKey.trim().toLowerCase();
      const page = await createCmsPage({
        key,
        type: newType,
        locales: {
          nl: { slug: key, content: emptyPageContent(key) },
          en: { slug: `${key}-en`, content: emptyPageContent(key) },
        },
        locale,
      });
      setCreating(false);
      setNewKey("");
      window.location.href = `/admin/cms/pages/${page.id}`;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminListPage
      title={t.adminPages}
      accent="cms"
      backHref="/admin/cms"
      subtitle={
        locale === "en"
          ? "Create, draft, preview and publish fixed-template pages."
          : "Maak, bewerk concepten, bekijk en publiceer pagina's met vaste templates."
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
            placeholder={locale === "en" ? "Search key or slug…" : "Zoek key of slug…"}
            className="min-w-[200px] flex-1 rounded-xl border border-blue-100 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as CmsPageType | "")}
            className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
          >
            <option value="">{locale === "en" ? "All types" : "Alle types"}</option>
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {ty}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-xl bg-mist px-4 py-2 text-sm font-bold text-navy"
          >
            {t.search}
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white"
        >
          {locale === "en" ? "New page" : "Nieuwe pagina"}
        </button>
      </div>

      {creating && (
        <div className="mb-4 grid gap-3 rounded-2xl border border-blue-100 bg-mist/50 p-4 sm:grid-cols-3">
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="key (bijv. privacy)"
            className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as CmsPageType)}
            className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
          >
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>
                {ty}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onCreate()}
            className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {busy ? t.saving : locale === "en" ? "Create" : "Aanmaken"}
          </button>
        </div>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-blue-100">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-mist text-xs font-extrabold uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">NL</th>
              <th className="px-4 py-3">EN</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-t border-blue-50">
                <td className="px-4 py-3 font-bold text-navy">
                  {p.key}
                  {p.archived && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase text-muted">
                      archived
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">{p.type}</td>
                <td className="px-4 py-3">
                  <LocaleBadge summary={p.locales.nl} />
                </td>
                <td className="px-4 py-3">
                  <LocaleBadge summary={p.locales.en} />
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/cms/pages/${p.id}`} className="font-extrabold text-brand hover:underline">
                    {locale === "en" ? "Open" : "Openen"}
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {t.empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminListPage>
  );
}

function LocaleBadge({
  summary,
}: {
  summary?: { slug: string; published: boolean; draft_revision: number } | undefined;
}) {
  if (!summary) return <span className="text-xs font-bold text-red-600">missing</span>;
  return (
    <span className="text-xs">
      <span className="font-mono text-navy">{summary.slug}</span>
      <span
        className={`ml-2 rounded-full px-2 py-0.5 font-extrabold uppercase ${
          summary.published ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
        }`}
      >
        {summary.published ? "live" : "draft"}
      </span>
    </span>
  );
}
