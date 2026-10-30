"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api";
import { fetchDiscountCodes, type PublicDiscountCode } from "@/lib/homepage";
import { fetchDiscoveryCategories, type DiscoveryCategory } from "@/lib/discovery";
import { useShopBonus } from "@/store/ShopBonusContext";

export default function KortingscodesPage() {
  const { copyCode, justCopied } = useShopBonus();
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [codes, setCodes] = useState<PublicDiscountCode[]>([]);
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(qInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  useEffect(() => {
    const ac = new AbortController();
    fetchDiscoveryCategories(ac.signal)
      .then(setCategories)
      .catch(() => undefined);
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setError(null);
    void fetchDiscountCodes({ limit: 48, search: q || undefined, signal: ac.signal })
      .then((data) => setCodes(data))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "Kon kortingscodes niet laden.");
        setCodes([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [q]);

  const results = useMemo(() => codes, [codes]);

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-120px] top-[200px] h-96 w-96 bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">Kortingscodes</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(2.2rem,5vw,3.4rem)] font-black tracking-tight text-navy">
              Actuele <span className="text-brand">kortingscodes</span>
            </h1>
            <p className="mt-2 text-muted">
              Alleen gepubliceerde codes van goedgekeurde webshops. Codes worden pas zichtbaar via ShopBonus.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <span className="pl-2 text-muted" aria-hidden>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Zoek code of webshop…"
              aria-label="Zoek kortingscode of webshop"
              className="w-48 bg-transparent py-1.5 text-sm font-medium focus:outline-none sm:w-56"
            />
          </div>
        </div>

        {categories.length > 0 && (
          <p className="mt-6 text-sm text-muted">
            Blader ook via{" "}
            <Link href="/webshops" className="font-bold text-brand hover:underline">
              alle webshops
            </Link>{" "}
            en filter op categorie.
          </p>
        )}

        {error ? (
          <div className="mt-8 rounded-3xl bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-black text-navy">Kon codes niet laden</h3>
            <p className="mt-2 text-muted">{error}</p>
          </div>
        ) : loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-blue-50" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-white p-14 text-center shadow-sm">
            <h3 className="text-xl font-black text-navy">Geen codes gevonden</h3>
            <p className="mt-2 text-muted">Probeer een andere zoekterm of bekijk de webshopdirectory.</p>
            <Link
              href="/webshops?has_offers=1"
              className="mt-5 inline-flex rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"
            >
              Webshops met aanbiedingen
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid gap-4 pb-4 sm:grid-cols-2">
            {results.map((c) => {
              const code = c.code;
              const copied = justCopied === code;
              const slug = c.slug || c.offer_slug || c.webshop.slug;
              return (
                <article
                  key={c.id}
                  className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_10px_30px_-14px_rgba(10,27,63,0.18)] sm:flex-row sm:items-center"
                >
                  {c.webshop.cover_url || c.webshop.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.webshop.cover_url || c.webshop.logo_url || ""}
                      alt=""
                      className="h-24 w-full rounded-2xl object-cover sm:h-20 sm:w-20"
                      loading="lazy"
                    />
                  ) : (
                    <span className="grid h-24 w-full place-items-center rounded-2xl bg-brand-light text-lg font-black text-brand sm:h-20 sm:w-20">
                      {c.webshop.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand">{c.webshop.name}</p>
                    <h3 className="mt-0.5 font-extrabold text-navy">{c.title}</h3>
                    <p className="mt-1 text-sm text-muted">{c.summary || c.terms || "Bekijk voorwaarden bij de aanbieding."}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    {code ? (
                      <button
                        type="button"
                        onClick={() => copyCode(code)}
                        className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-2.5 font-black tracking-wider text-navy transition hover:border-brand"
                      >
                        {copied ? "Gekopieerd!" : code}
                      </button>
                    ) : null}
                    <Link
                      href={c.href || `/aanbiedingen/${encodeURIComponent(slug)}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark"
                    >
                      Bekijk aanbieding
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
