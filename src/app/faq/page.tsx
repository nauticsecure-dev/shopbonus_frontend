"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api";
import { fetchPublicFaq, type PublicFaqCategory } from "@/lib/cms";
import RichTextView from "@/components/cms/RichTextView";

export default function FaqPage() {
  const { locale, dictionary: t } = useLocale();
  const [categories, setCategories] = useState<PublicFaqCategory[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (hash) setOpenId(hash);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchPublicFaq(locale, query)
      .then((data) => {
        if (!cancelled) setCategories(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t.errorGeneric);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [locale, query, t.errorGeneric]);

  const total = useMemo(
    () => categories.reduce((n, c) => n + c.items.length, 0),
    [categories]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6" data-testid="faq-page">
      <h1 className="text-3xl font-black tracking-tight text-navy sm:text-4xl">{t.faqTitle}</h1>
      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.faqSearchPlaceholder}
          className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm outline-none ring-brand/30 focus:ring-2"
          data-testid="faq-search"
        />
      </form>

      {loading && <p className="mt-8 text-sm text-muted">{t.loading}</p>}
      {error && <p className="mt-8 text-sm text-red-600">{error}</p>}
      {!loading && !error && total === 0 && <p className="mt-8 text-sm text-muted">{t.faqEmpty}</p>}

      <div className="mt-8 space-y-8">
        {categories.map((cat) => (
          <section key={cat.key} id={`cat-${cat.key}`}>
            <h2 className="text-lg font-extrabold text-navy">{cat.name}</h2>
            <div className="mt-3 divide-y divide-blue-50 rounded-2xl border border-blue-100 bg-white">
              {cat.items.map((item) => {
                const open = openId === item.id;
                return (
                  <div key={item.id} id={item.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => {
                        setOpenId(open ? null : item.id);
                        if (!open && typeof history !== "undefined") {
                          history.replaceState(null, "", `#${item.id}`);
                        }
                      }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                    >
                      <span className="font-bold text-navy">{item.question}</span>
                      <span className="text-brand">{open ? "−" : "+"}</span>
                    </button>
                    {open && (
                      <div className="px-4 pb-4">
                        <RichTextView doc={item.answer} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
