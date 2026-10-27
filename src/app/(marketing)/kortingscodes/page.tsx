"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { discountCodes, categories, webshops } from "@/fixtures/dummy";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export default function KortingscodesPage() {
  const { copyCode, justCopied } = useShopBonus();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Alle");

  const results = useMemo(() => {
    let list = [...discountCodes];
    // Also generate codes from webshops offers for more content
    const extra = webshops.flatMap((w) =>
      w.offers.slice(0, 1).map((o) => ({
        id: `gen-${w.slug}-${o.id}`,
        shopSlug: w.slug,
        shopName: w.name,
        title:
          o.type === "percent"
            ? `${o.value}% korting bij ${w.name}`
            : `€${o.value} korting bij ${w.name}`,
        meta: `Vanaf €${o.minOrder}${o.maxDiscount ? ` · Max €${o.maxDiscount}` : ""} · ${w.category}`,
        code: `${w.name.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase()}${o.value}`,
        image: w.banner,
        category: w.category,
      }))
    );

    const all = [
      ...list.map((c) => {
        const shop = webshops.find((w) => w.slug === c.shopSlug);
        return { ...c, category: shop?.category ?? "Overig" };
      }),
      ...extra,
    ];

    let filtered = all;
    if (cat !== "Alle") filtered = filtered.filter((c) => c.category === cat);
    if (q.trim()) {
      const n = q.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(n) ||
          c.shopName.toLowerCase().includes(n) ||
          c.code.toLowerCase().includes(n)
      );
    }
    return filtered;
  }, [q, cat]);

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
              {results.length} codes bij aangesloten webshops. Kopieer en bespaar direct.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-white p-2 shadow-sm">
            <span className="pl-2 text-muted">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5" />
                <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Zoek code of webshop…"
              className="w-48 bg-transparent py-1.5 text-sm font-medium focus:outline-none sm:w-56"
            />
          </div>
        </div>

        <div className="no-scrollbar mt-6 flex gap-2.5 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold transition ${
                cat === c ? "bg-navy text-white shadow-lg" : "bg-white text-navy shadow-sm hover:bg-brand-light"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 pb-4 sm:grid-cols-2">
          {results.map((c) => {
            const copied = justCopied === c.code;
            return (
              <article
                key={c.id}
                className="flex flex-col gap-4 rounded-3xl bg-white p-5 shadow-[0_10px_30px_-14px_rgba(10,27,63,0.18)] sm:flex-row sm:items-center"
              >
                <img
                  src={c.image}
                  alt={c.shopName}
                  className="h-24 w-full rounded-2xl object-cover sm:h-20 sm:w-20"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand">{c.shopName}</p>
                  <h3 className="mt-0.5 font-extrabold text-navy">{c.title}</h3>
                  <p className="mt-1 text-sm text-muted">{c.meta}</p>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                  <button
                    onClick={() => copyCode(c.code)}
                    className="flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 px-4 py-2.5 font-black tracking-wider text-navy transition hover:border-brand"
                  >
                    {c.code}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted">
                      <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
                      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </button>
                  <Link
                    href={`/webshops/${c.shopSlug}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark"
                  >
                    {copied ? "Gekopieerd!" : "Naar webshop"}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M14 5h5v5M19 5 10 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {results.length === 0 && (
          <div className="mt-8 rounded-3xl bg-white p-14 text-center shadow-sm">
            <p className="text-5xl">🏷️</p>
            <h3 className="mt-4 text-xl font-black text-navy">Geen codes gevonden</h3>
            <p className="mt-2 text-muted">Probeer een andere zoekterm of categorie.</p>
          </div>
        )}
      </section>
    </div>
  );
}
