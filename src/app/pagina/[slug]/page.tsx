"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchPublicPage, type PublicCmsPage } from "@/lib/cms";
import { useLocale } from "@/i18n/LocaleContext";
import PageInlineCms, { PageBody } from "@/components/cms/PageInlineCms";

export default function CmsPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const { locale, dictionary: t } = useLocale();
  const [page, setPage] = useState<PublicCmsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPublicPage(locale, slug)
      .then((data) => {
        if (!cancelled) setPage(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : t.notFound);
        setPage(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, locale, t.notFound]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6" role="status" aria-label={t.loading}>
        <div className="h-8 w-1/2 animate-pulse rounded bg-blue-100" />
        <div className="mt-6 h-40 animate-pulse rounded-3xl bg-blue-50" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-2xl font-black text-navy">{t.notFound}</h1>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/" className="mt-6 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
          {t.backHome}
        </Link>
      </div>
    );
  }

  return (
    <PageInlineCms published={page}>
      {({ content }) => <PageBody content={content} />}
    </PageInlineCms>
  );
}
