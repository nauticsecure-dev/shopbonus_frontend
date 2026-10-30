"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchDiscountCodes, type PublicDiscountCode } from "@/lib/homepage";
import { formatNlDate } from "@/lib/money";
import { useShopBonus } from "@/store/ShopBonusContext";
import type { HomepageContent } from "@/lib/homepageDefaults";

type Props = {
  content: HomepageContent["discount_codes"];
  initialCodes?: PublicDiscountCode[];
};

export default function DiscountCodesPanel({ content, initialCodes = [] }: Props) {
  const { copyCode, justCopied } = useShopBonus();
  const [codes, setCodes] = useState(initialCodes);
  const [loading, setLoading] = useState(initialCodes.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialCodes.length > 0) {
      setCodes(initialCodes.slice(0, content.limit));
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    const timeout = window.setTimeout(() => ac.abort(), 8000);
    setLoading(true);
    void fetchDiscountCodes({ limit: content.limit, signal: ac.signal })
      .then((rows) => {
        setCodes(rows);
        setError(false);
      })
      .catch(() => {
        setError(true);
        setCodes([]);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      ac.abort();
    };
  }, [initialCodes, content.limit]);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7" data-testid="discount-codes-panel">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-black text-navy">{content.heading}</h3>
        <Link
          href={content.cta_href}
          className="flex items-center gap-1 text-sm font-bold text-brand hover:underline"
        >
          {content.cta_label.replace(/→$/, "").trim()}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="mt-5 space-y-3">
        {loading &&
          Array.from({ length: Math.min(content.limit, 2) }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}

        {!loading && error && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
            Kortingscodes konden niet worden geladen. Probeer het later opnieuw.
          </p>
        )}

        {!loading && !error && codes.length === 0 && (
          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-muted">
            Momenteel geen actieve publieke kortingscodes. Bekijk wel de actuele aanbiedingen.
          </p>
        )}

        {!loading &&
          codes.map((c, index) => {
            const copied = justCopied === c.code;
            const image = c.webshop.cover_url || c.webshop.logo_url;
            const metaParts = [c.terms || c.summary, c.ends_at ? `Geldig tot ${formatNlDate(c.ends_at)}` : null]
              .filter(Boolean)
              .join(" · ");
            const rowKey = c.id || c.slug || `${c.code}-${c.webshop.slug}-${index}`;
            return (
              <div
                key={rowKey}
                className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-light text-sm font-black text-brand">
                      {c.webshop.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-navy">{c.title}</p>
                    <p className="truncate text-xs text-muted">{metaParts || c.webshop.name}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => copyCode(c.code)}
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 font-black tracking-wider text-navy transition hover:border-brand"
                    aria-label={`Kopieer code ${c.code}`}
                  >
                    {c.code}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted" aria-hidden>
                      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
                      <path
                        d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                  <Link
                    href={c.href || `/webshops/${c.webshop.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-dark"
                  >
                    {copied ? "Gekopieerd!" : "Naar webshop"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path
                        d="M14 5h5v5M19 5 10 14"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
