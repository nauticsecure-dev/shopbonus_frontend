"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { WebshopCard, Eyebrow } from "@/components/Cards";
import { categories, webshops } from "@/fixtures/dummy";

function WebshopsInner() {
  const params = useSearchParams();
  const initialCat = params.get("cat") ?? "Alle";
  const initialQ = params.get("q") ?? "";
  const [cat, setCat] = useState(initialCat);
  const [q, setQ] = useState(initialQ);
  const [sort, setSort] = useState<"populair" | "korting" | "naam">("populair");

  const results = useMemo(() => {
    let list = [...webshops];
    if (cat !== "Alle") list = list.filter((w) => w.category === cat || w.tags.includes(cat));
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (w) =>
          w.name.toLowerCase().includes(needle) ||
          w.tags.some((t) => t.toLowerCase().includes(needle)) ||
          w.category.toLowerCase().includes(needle)
      );
    }
    if (sort === "naam") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "korting")
      list.sort((a, b) => (b.offers[0]?.value ?? 0) - (a.offers[0]?.value ?? 0));
    if (sort === "populair") list.sort((a, b) => b.reviews - a.reviews);
    return list;
  }, [cat, q, sort]);

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-120px] top-[200px] h-96 w-96 bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <Eyebrow>Alle webshops</Eyebrow>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-[clamp(2.2rem,5vw,3.6rem)] font-black tracking-tight text-navy">
              Ontdek <span className="text-brand">webshops</span>
            </h1>
            <p className="mt-2 text-muted">
              {results.length} webshops met exclusieve vouchers voor jou.
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
              placeholder="Zoeken…"
              className="w-40 bg-transparent py-1.5 text-sm font-medium focus:outline-none sm:w-52"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
              className="rounded-xl bg-mist px-3 py-2 text-sm font-bold text-navy focus:outline-none"
            >
              <option value="populair">Populair</option>
              <option value="korting">Hoogste korting</option>
              <option value="naam">Naam A–Z</option>
            </select>
          </div>
        </div>

        <div className="no-scrollbar mt-6 flex gap-2.5 overflow-x-auto pb-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-extrabold transition ${
                cat === c
                  ? "bg-navy text-white shadow-lg"
                  : "bg-white text-navy shadow-sm hover:bg-brand-light"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {results.length === 0 ? (
          <div className="mt-10 rounded-3xl bg-white p-14 text-center shadow-sm">
            <p className="text-5xl">🔍</p>
            <h3 className="mt-4 text-xl font-black text-navy">Geen webshops gevonden</h3>
            <p className="mt-2 text-muted">Probeer een andere zoekterm of categorie.</p>
            <button
              onClick={() => {
                setQ("");
                setCat("Alle");
              }}
              className="mt-5 rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((w) => (
              <WebshopCard key={w.slug} shop={w} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function WebshopsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl p-12">Laden…</div>}>
      <WebshopsInner />
    </Suspense>
  );
}
