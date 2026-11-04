"use client";

import { useLocale } from "@/i18n/LocaleContext";
import Link from "next/link";
import ShopImage from "@/components/ShopImage";
import { useEffect, useState } from "react";
import {
  categoryLabelNl,
  fetchDiscoveryWebshops,
  fetchDiscoveryWebshop,
  isDiscoveryAbort,
  resolveCoverUrl,
  shopBadgeLabel,
  type DiscoveryWebshopCard,
} from "@/lib/discovery";

type Props = {
  /** Preloaded shops from the server (optional). */
  initialShops?: DiscoveryWebshopCard[];
  limit?: number;
  featuredSlugs?: string[];
  heading?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const EMPTY_SHOPS: DiscoveryWebshopCard[] = [];

export default function PopularWebshops({
  initialShops = EMPTY_SHOPS,
  limit = 4,
  featuredSlugs,
  heading = "Populaire webshops",
  ctaLabel = "Bekijk alle webshops",
  ctaHref = "/webshops",
}: Props) {
  const { locale } = useLocale();
  const slugsKey = featuredSlugs?.join(",");
  const [shops, setShops] = useState<DiscoveryWebshopCard[]>(initialShops.slice(0, limit));
  const [loading, setLoading] = useState(initialShops.length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    if (initialShops.length > 0 && slugsKey === undefined) {
      queueMicrotask(() => { if (!ac.signal.aborted) { setShops(initialShops.slice(0, limit)); setLoading(false); } });
      return () => ac.abort();
    }
    const timeout = window.setTimeout(() => ac.abort(), 8000);
    queueMicrotask(() => { if (!ac.signal.aborted) setLoading(true); });
    const request = slugsKey !== undefined
      ? Promise.all(slugsKey.split(",").filter(Boolean).slice(0, limit).map(slug => fetchDiscoveryWebshop(slug, ac.signal))).then(data => ({ data }))
      : fetchDiscoveryWebshops({ sort: "most_offers", per_page: limit, page: 1, signal: ac.signal });
    void request
      .then((res) => {
        if (ac.signal.aborted) return;
        setShops(res.data.slice(0, limit));
        setError(false);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        if (isDiscoveryAbort(err)) {
          setError(true);
          setShops([]);
          return;
        }
        setError(true);
        setShops([]);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        setLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      ac.abort();
    };
  }, [initialShops, limit, slugsKey, locale]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8" data-testid="popular-webshops">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">{heading}</h2>
        <Link href={ctaHref} className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
          {ctaLabel.replace(/→$/, "").trim()}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="h-44 animate-pulse bg-blue-100" />
              <div className="space-y-2 px-4 py-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-blue-50" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-blue-50" />
              </div>
            </div>
          ))}
        </div>
      ) : error || shops.length === 0 ? (
        <div className="mt-6 rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="font-bold text-navy">
            {error ? (locale === "en" ? "Webshops could not be loaded." : "Webshops konden niet worden geladen.") : (locale === "en" ? "No published webshops yet." : "Nog geen gepubliceerde webshops.")}
          </p>
          <Link href="/webshops" className="mt-4 inline-flex rounded-2xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white">
            {locale === "en" ? "View webshops" : "Naar webshops"}
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {shops.map((shop) => {
            const cover = resolveCoverUrl(shop);
            const badge = shopBadgeLabel(shop);
            const category = shop.categories[0] ? (locale === "en" ? shop.categories[0].label?.en || shop.categories[0].key : categoryLabelNl(shop.categories[0])) : "Webshop";
            return (
              <Link
                key={shop.slug}
                href={`/webshops/${shop.slug}`}
                className="group lift overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-14px_rgba(10,27,63,0.2)]"
              >
                <div className="relative h-44 overflow-hidden bg-gradient-to-br from-brand-light to-mist">
                  <ShopImage src={cover} name={shop.name} className="h-full w-full object-cover text-3xl transition-transform duration-500 group-hover:scale-105" />
                  {badge && (
                    <span className="absolute left-3 top-3 rounded-full bg-white px-3.5 py-1.5 text-xs font-extrabold text-brand shadow">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 px-4 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-extrabold text-navy">{shop.name}</p>
                    <p className="truncate text-sm text-muted">{category}</p>
                  </div>
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-navy transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
