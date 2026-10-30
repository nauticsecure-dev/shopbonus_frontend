"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import { listTranslationStatuses, type TranslationStatusRow } from "@/lib/cms";
import { useLocale } from "@/i18n/LocaleContext";

const hubs = [
  {
    href: "/admin/cms/pages",
    titleNl: "Pagina's",
    titleEn: "Pages",
    bodyNl: "Juridische en info-pagina's, concepten, publiceren, revisies.",
    bodyEn: "Legal and info pages, drafts, publish, revisions.",
  },
  {
    href: "/admin/cms/faq",
    titleNl: "FAQ",
    titleEn: "FAQ",
    bodyNl: "Categorieën, volgorde, doelgroep en publicatie.",
    bodyEn: "Categories, order, audience and publication.",
  },
  {
    href: "/admin/cms/cookies",
    titleNl: "Cookiebeleid",
    titleEn: "Cookie policy",
    bodyNl: "Versies, categorieën, allowlisted trackers en stats.",
    bodyEn: "Versions, categories, allowlisted trackers and stats.",
  },
];

export default function AdminCmsHubPage() {
  const { locale, dictionary: t } = useLocale();
  const [rows, setRows] = useState<TranslationStatusRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    void listTranslationStatuses(locale)
      .then((data) => {
        if (!ac.signal.aborted) setRows(data);
      })
      .catch((err) => {
        if (!ac.signal.aborted) {
          setError(err instanceof ApiError ? err.message : t.errorGeneric);
        }
      });
    return () => ac.abort();
  }, [locale, t.errorGeneric]);

  const stale = rows.filter((r) => r.status !== "published");

  return (
    <AdminListPage
      title={t.adminContentStudio}
      accent="cms"
      subtitle={
        locale === "en"
          ? "Searchable studio for pages, FAQ, cookies and translation status. Drafts never change public content."
          : "Doorzoekbare studio voor pagina's, FAQ, cookies en vertaalstatus. Concepten wijzigen nooit publieke content."
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {hubs.map((h) => (
          <Link
            key={h.href}
            href={h.href}
            className="rounded-2xl border border-blue-100 bg-white p-5 transition hover:border-brand/40 hover:shadow-md"
          >
            <h2 className="text-lg font-extrabold text-navy">{locale === "en" ? h.titleEn : h.titleNl}</h2>
            <p className="mt-2 text-sm text-muted">{locale === "en" ? h.bodyEn : h.bodyNl}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-base font-extrabold text-navy">{t.adminTranslations}</h3>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {!error && stale.length === 0 && (
          <p className="mt-2 text-sm text-muted">
            {locale === "en" ? "All locales published." : "Alle locales gepubliceerd."}
          </p>
        )}
        {stale.length > 0 && (
          <ul className="mt-3 divide-y divide-blue-50 rounded-2xl border border-blue-100 bg-white">
            {stale.slice(0, 40).map((r) => (
              <li key={`${r.page}-${r.locale}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="font-bold text-navy">
                  {r.page} · {r.locale.toUpperCase()}
                </span>
                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-extrabold uppercase text-amber-700">
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminListPage>
  );
}
