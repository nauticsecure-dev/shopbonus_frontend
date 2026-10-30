"use client";

import Link from "next/link";
import { useState } from "react";
import {
  categoryLabelNl,
  initialsFromName,
  offerCountLabel,
  resolveCoverUrl,
  shopBadgeLabel,
  type DiscoveryWebshopCard as ShopCard,
} from "@/lib/discovery";
import { formatMinor } from "@/lib/money";

export function DiscoveryWebshopCard({ shop }: { shop: ShopCard }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [logoFailed, setLogoFailed] = useState(false);
  const cover = resolveCoverUrl(shop);
  const count = shop.active_offer_count ?? shop.offer_count ?? 0;
  const cats = shop.categories.map(categoryLabelNl);
  const badge = shopBadgeLabel(shop);
  const featured = shop.featured_offer;

  return (
    <Link
      href={`/webshops/${shop.slug}`}
      className="lift group flex h-full flex-col overflow-hidden rounded-[1.35rem] bg-white shadow-[0_12px_40px_-18px_rgba(10,27,63,0.28)]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-brand-light to-mist">
        {cover && !imgFailed ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#dbeafe] via-[#eff6ff] to-[#bfdbfe]">
            <span className="text-4xl font-black text-brand/40">{initialsFromName(shop.name)}</span>
          </div>
        )}
        {count > 0 && (
          <span className="absolute right-3 top-3 rounded-full bg-[#22c55e] px-3 py-1 text-[12px] font-extrabold text-white shadow-sm">
            {offerCountLabel(count)}
          </span>
        )}
        <div className="absolute -bottom-6 left-5">
          {shop.logo_url && !logoFailed ? (
            <img
              src={shop.logo_url}
              alt={`${shop.name} logo`}
              loading="lazy"
              onError={() => setLogoFailed(true)}
              className="h-14 w-14 rounded-full border-[3px] border-white bg-white object-cover shadow-md"
            />
          ) : (
            <span
              aria-hidden
              className="grid h-14 w-14 place-items-center rounded-full border-[3px] border-white bg-brand text-sm font-black text-white shadow-md"
            >
              {initialsFromName(shop.name)}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-9">
        <h3 className="text-lg font-extrabold tracking-tight text-navy">{shop.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm leading-snug text-muted">
          {shop.short_description || "Ontdek de aanbiedingen van deze webshop."}
        </p>
        {(badge || featured) && (
          <p className="mt-3 line-clamp-2 text-sm font-extrabold text-brand">
            {badge || featured?.title}
            {featured?.price_minor != null && featured.price_minor > 0
              ? ` · vanaf ${formatMinor(featured.price_minor)} tegoed`
              : ""}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <p className="line-clamp-2 text-[13px] font-semibold text-brand/80">
            {cats.length > 0 ? cats.join(" · ") : "Webshop"}
          </p>
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-8px_rgba(11,116,255,0.8)] transition-transform group-hover:translate-x-0.5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

export function DiscoveryCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.35rem] bg-white shadow-sm">
      <div className="aspect-[16/10] animate-pulse bg-blue-100/80" />
      <div className="space-y-3 px-5 pb-5 pt-9">
        <div className="h-5 w-2/3 animate-pulse rounded bg-blue-50" />
        <div className="h-4 w-full animate-pulse rounded bg-blue-50" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-blue-50" />
      </div>
    </div>
  );
}
