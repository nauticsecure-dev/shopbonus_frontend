"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DiscoveryCardSkeleton, DiscoveryWebshopCard } from "@/components/DiscoveryWebshopCard";
import {
  discoveryErrorMessage,
  fetchDiscoveryCategories,
  fetchDiscoveryWebshops,
  isDiscoveryAbort,
  type DiscoveryCategory,
  type DiscoverySort,
  type DiscoveryWebshopCard as ShopCard,
  type PageMeta,
} from "@/lib/discovery";
import { fetchVouchers } from "@/lib/benefits";
import { formatMinor } from "@/lib/money";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

const PRIMARY_PILLS: { key: string | null; label: string; icon: "grid" | "home" | "fashion" | "tech" | "beauty" }[] = [
  { key: null, label: "Alle categorieën", icon: "grid" },
  { key: "home_living", label: "Wonen", icon: "home" },
  { key: "fashion", label: "Mode", icon: "fashion" },
  { key: "electronics", label: "Elektronica", icon: "tech" },
  { key: "beauty_health", label: "Beauty", icon: "beauty" },
];

const SORT_OPTIONS: { value: DiscoverySort; label: string }[] = [
  { value: "relevance", label: "Relevantie" },
  { value: "most_offers", label: "Meeste aanbiedingen" },
  { value: "name", label: "Naam A–Z" },
  { value: "newest", label: "Recent toegevoegd" },
];

function CategoryIcon({ name }: { name: (typeof PRIMARY_PILLS)[number]["icon"] }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none" as const };
  if (name === "grid") {
    return (
      <svg {...common}>
        <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (name === "home") {
    return (
      <svg {...common}>
        <path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "fashion") {
    return (
      <svg {...common}>
        <path d="M8 4h8l2 4-3 2v10H9V10L6 8l2-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  if (name === "tech") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 21h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M12 3c2.5 3 5 5.2 5 8.2A5 5 0 0 1 7 11.2C7 8.2 9.5 6 12 3Z" stroke="currentColor" strokeWidth="2" />
      <path d="M9 18c.8 1.5 1.8 2.5 3 3 1.2-.5 2.2-1.5 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function WebshopsInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { session } = useSession();
  const { availableMinor, apiMode, refreshVouchers } = useShopBonus();

  const [qInput, setQInput] = useState(params.get("q") ?? params.get("search") ?? "");
  const [q, setQ] = useState(qInput);
  const [category, setCategory] = useState<string | null>(params.get("category") ?? params.get("cat") ?? null);
  const [hasOffers, setHasOffers] = useState(
    params.get("has_offers") === "1" || params.get("has_offers") === "true"
  );
  const [sort, setSort] = useState<DiscoverySort>((params.get("sort") as DiscoverySort) || "relevance");
  const [page, setPage] = useState(Number(params.get("page") || 1) || 1);

  const [shops, setShops] = useState<ShopCard[]>([]);
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const [categories, setCategories] = useState<DiscoveryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeVoucherCount, setActiveVoucherCount] = useState(0);

  const requestId = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Debounce search typing
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(qInput);
      setPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [qInput]);

  // Sync URL
  useEffect(() => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (category) sp.set("category", category);
    if (hasOffers) sp.set("has_offers", "1");
    if (sort !== "relevance") sp.set("sort", sort);
    if (page > 1) sp.set("page", String(page));
    const next = sp.toString();
    router.replace(next ? `/webshops?${next}` : "/webshops", { scroll: false });
  }, [q, category, hasOffers, sort, page, router]);

  useEffect(() => {
    const ac = new AbortController();
    fetchDiscoveryCategories(ac.signal)
      .then(setCategories)
      .catch((err) => {
        if (!isDiscoveryAbort(err)) console.warn("categories", err);
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (!session || !apiMode) {
      setActiveVoucherCount(0);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await refreshVouchers("active");
        const list = await fetchVouchers("active");
        if (!cancelled) setActiveVoucherCount(list.length);
      } catch {
        if (!cancelled) setActiveVoucherCount(0);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, apiMode, refreshVouchers]);

  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const id = ++requestId.current;
    setError(null);
    setSearching(true);
    setLoading(true);
    setShops([]);
    setMeta(null);

    const started = performance.now();
    const effectiveSort: DiscoverySort =
      sort === "relevance" && q.trim()
        ? "relevance"
        : sort === "relevance" && !q.trim()
          ? "most_offers"
          : sort;

    void (async () => {
      try {
        const res = await fetchDiscoveryWebshops({
          search: q.trim() || undefined,
          category: category || undefined,
          has_offers: hasOffers || undefined,
          sort: effectiveSort,
          page,
          per_page: 12,
          signal: ac.signal,
        });
        if (id !== requestId.current) return;
        setShops(res.data);
        setMeta(res.meta);
        if (typeof window !== "undefined") {
          console.info("[discovery]", {
            route: "/api/v1/public/webshops",
            ms: Math.round(performance.now() - started),
            total: res.meta.total,
            search: q.trim() || null,
            category,
            has_offers: hasOffers || null,
            sort: effectiveSort,
          });
        }
      } catch (err) {
        if (isDiscoveryAbort(err) || id !== requestId.current) return;
        setError(discoveryErrorMessage(err));
        setShops([]);
        setMeta(null);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setSearching(false);
        }
      }
    })();

    return () => ac.abort();
  }, [q, category, hasOffers, sort, page]);

  const retry = () => {
    setPage((p) => p);
    setLoading(true);
    setError(null);
    // bump by toggling a no-op via resetting same filters
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const id = ++requestId.current;
    const effectiveSort: DiscoverySort =
      sort === "relevance" && !q.trim() ? "most_offers" : sort;
    void fetchDiscoveryWebshops({
      search: q.trim() || undefined,
      category: category || undefined,
      has_offers: hasOffers || undefined,
      sort: effectiveSort,
      page,
      per_page: 12,
      signal: ac.signal,
    })
      .then((res) => {
        if (id !== requestId.current) return;
        setShops(res.data);
        setMeta(res.meta);
        setError(null);
      })
      .catch((err) => {
        if (isDiscoveryAbort(err) || id !== requestId.current) return;
        setError(discoveryErrorMessage(err));
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  };

  const extraCategories = useMemo(() => {
    const primary = new Set(PRIMARY_PILLS.map((p) => p.key).filter(Boolean));
    return categories.filter((c) => !primary.has(c.key));
  }, [categories]);

  const clearFilters = () => {
    setQInput("");
    setQ("");
    setCategory(null);
    setHasOffers(false);
    setSort("relevance");
    setPage(1);
  };

  const hasFilters = Boolean(q.trim()) || Boolean(category) || hasOffers || sort !== "relevance";
  const voucherLabel =
    activeVoucherCount === 1 ? "1 actieve voucher" : `${activeVoucherCount} actieve vouchers`;

  return (
    <div className="relative overflow-hidden pb-16">
      <div className="page-blob left-[-120px] top-[-40px] h-72 w-72 bg-blue-200/40" />
      <div className="page-blob right-[-100px] top-[160px] h-80 w-80 bg-sky-100/80" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
              MEER WEBSHOPS. MEER VOORDEEL.
            </p>
            <h1 className="mt-3 text-[clamp(2rem,4.5vw,3.25rem)] font-black leading-[1.1] tracking-tight text-navy">
              Ontdek webshops en aanbiedingen.
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted sm:text-base">
              Blader door honderden webshops en profiteer van unieke kortingsvouchers via ShopBonus.
            </p>
          </div>

          {session ? (
            <Link
              href="/mijn-voordelen"
              className="flex w-full max-w-md items-stretch overflow-hidden rounded-[1.35rem] bg-white shadow-[0_16px_40px_-20px_rgba(10,27,63,0.35)] lg:w-auto"
            >
              <div className="flex flex-1 items-center gap-3 px-5 py-4">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-light text-brand">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="7" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
                    <path d="M16 7V6a3 3 0 0 0-6 0v1" stroke="currentColor" strokeWidth="2" />
                    <circle cx="16" cy="13.5" r="1.25" fill="currentColor" />
                  </svg>
                </span>
                <span>
                  <span className="block text-[11px] font-semibold text-muted">Mijn ShopBonus-tegoed</span>
                  <strong className="text-xl font-black text-navy">{formatMinor(availableMinor)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 border-l border-blue-50 px-5 py-4">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-light text-brand">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M9 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="text-sm font-extrabold text-navy">{voucherLabel}</span>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ) : (
            <div className="flex w-full max-w-md flex-col gap-3 rounded-[1.35rem] bg-white p-5 shadow-[0_16px_40px_-20px_rgba(10,27,63,0.35)] sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-navy">Bekijk jouw tegoed en vouchers</p>
                <p className="mt-1 text-sm text-muted">Log in om je ShopBonus-saldo te zien.</p>
              </div>
              <Link
                href="/account?mode=login"
                className="inline-flex items-center justify-center rounded-2xl bg-brand px-5 py-3 text-sm font-extrabold text-white"
              >
                Inloggen
              </Link>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="mt-8">
          <label className="flex items-center gap-3 rounded-full border border-blue-100 bg-white px-5 py-3.5 shadow-[0_10px_30px_-18px_rgba(10,27,63,0.35)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-brand">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.4" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              placeholder="Zoek een webshop..."
              className="w-full bg-transparent text-[15px] font-medium text-navy placeholder:text-muted/80 focus:outline-none"
              aria-label="Zoek een webshop"
            />
            {searching && (
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
            )}
          </label>
        </div>

        {/* Filters */}
        <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1">
            {PRIMARY_PILLS.map((pill) => {
              const active = pill.key === category || (pill.key === null && category === null);
              return (
                <button
                  key={pill.label}
                  type="button"
                  onClick={() => {
                    setCategory(pill.key);
                    setPage(1);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                    active
                      ? "bg-brand text-white shadow-[0_10px_24px_-10px_rgba(11,116,255,0.8)]"
                      : "border border-blue-100 bg-white text-navy hover:bg-brand-light"
                  }`}
                >
                  <CategoryIcon name={pill.icon} />
                  {pill.label}
                </button>
              );
            })}
            {extraCategories.map((c) => {
              const active = category === c.key;
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setCategory(c.key);
                    setPage(1);
                  }}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                    active
                      ? "bg-brand text-white shadow-[0_10px_24px_-10px_rgba(11,116,255,0.8)]"
                      : "border border-blue-100 bg-white text-navy hover:bg-brand-light"
                  }`}
                >
                  {c.label.nl}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              aria-pressed={hasOffers}
              onClick={() => {
                setHasOffers((v) => !v);
                setPage(1);
              }}
              className={`inline-flex shrink-0 items-center rounded-full px-4 py-2.5 text-sm font-extrabold transition ${
                hasOffers
                  ? "bg-brand text-white shadow-[0_10px_24px_-10px_rgba(11,116,255,0.8)]"
                  : "border border-blue-100 bg-white text-navy hover:bg-brand-light"
              }`}
            >
              Met actieve aanbieding
            </button>
            <label className="relative inline-flex shrink-0 items-center">
              <span className="sr-only">Sorteren</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as DiscoverySort);
                  setPage(1);
                }}
                className="appearance-none rounded-full border border-blue-100 bg-white py-2.5 pl-4 pr-10 text-sm font-extrabold text-navy focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 text-muted">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="m7 10 5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </label>
          </div>
        </div>

        {/* States */}
        {error ? (
          <div className="mt-10 rounded-[1.5rem] bg-white p-10 text-center shadow-sm">
            <h3 className="text-xl font-black text-navy">Kon webshops niet laden</h3>
            <p className="mt-2 text-muted">{error}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-5 rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"
            >
              Opnieuw proberen
            </button>
          </div>
        ) : loading && shops.length === 0 ? (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <DiscoveryCardSkeleton key={i} />
            ))}
          </div>
        ) : shops.length === 0 ? (
          <div className="mt-10 rounded-[1.5rem] bg-white p-12 text-center shadow-sm">
            <h3 className="text-xl font-black text-navy">Geen webshops gevonden</h3>
            <p className="mt-2 text-muted">
              Geen webshops gevonden. Probeer een andere zoekterm of categorie.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 rounded-2xl bg-brand px-6 py-3 font-extrabold text-white"
              >
                Wis filters
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${searching ? "opacity-70 transition-opacity" : ""}`}
            >
              {shops.map((shop) => (
                <DiscoveryWebshopCard key={shop.slug} shop={shop} />
              ))}
            </div>

            {meta && meta.last_page > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-40"
                >
                  Vorige
                </button>
                <span className="text-sm font-semibold text-muted">
                  Pagina {meta.current_page} van {meta.last_page}
                </span>
                <button
                  type="button"
                  disabled={page >= meta.last_page}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-full border border-blue-100 bg-white px-5 py-2.5 text-sm font-bold text-navy disabled:opacity-40"
                >
                  Volgende
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default function WebshopsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto grid max-w-7xl gap-6 p-8 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <DiscoveryCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <WebshopsInner />
    </Suspense>
  );
}
