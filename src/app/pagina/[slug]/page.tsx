"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchPublicPage, type PublicCmsPage } from "@/lib/cms";
import { useLocale } from "@/i18n/LocaleContext";
import PageInlineCms, { PageBody } from "@/components/cms/PageInlineCms";

export default function CmsPublicPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const router = useRouter();
  const currentPage = useRef<PublicCmsPage | null>(null);
  const { locale, dictionary: t } = useLocale();
  const [page, setPage] = useState<PublicCmsPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    const previous = currentPage.current;
    const alternate = previous?.slug === slug ? previous.alternates[locale] : undefined;
    if (alternate && alternate !== slug) {
      router.replace(`/pagina/${encodeURIComponent(alternate)}`);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPublicPage(locale, slug)
      .then((data) => {
        if (!cancelled) { currentPage.current = data; setPage(data); }
      })
      .catch(async (err) => {
        if (cancelled) return;
        // Locale hydration can happen before the first request resolves.
        // Resolve a valid slug in the other language before reporting a 404.
        if (err instanceof ApiError && err.status === 404) {
          try {
            const source = await fetchPublicPage(locale === "en" ? "nl" : "en", slug);
            const target = source.alternates[locale];
            if (!cancelled && target && target !== slug) {
              router.replace(`/pagina/${encodeURIComponent(target)}`);
              return;
            }
          } catch { /* retain the original not-found response */ }
        }
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
  }, [slug, locale, t.notFound, router]);

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
    <PageInlineCms key={`${page.key}:${page.locale}`} published={page}>
      {({ content }) => <PageBody content={content} />}
    </PageInlineCms>
  );
}
