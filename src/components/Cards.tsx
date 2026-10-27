"use client";

import Link from "next/link";
import { Offer, Webshop, formatEuro, offerSubtitle, offerTitle } from "@/fixtures/dummy";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import { useState } from "react";

/* ---------- Webshop card ---------- */
export function WebshopCard({ shop }: { shop: Webshop }) {
  const best = shop.offers[0];
  return (
    <Link
      href={`/webshops/${shop.slug}`}
      className="lift group overflow-hidden rounded-3xl bg-white shadow-[0_10px_36px_-16px_rgba(10,27,63,0.25)]"
    >
      <div className="relative h-44 overflow-hidden">
        <img
          src={shop.banner}
          alt={shop.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy/50 via-transparent to-transparent" />
        <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3.5 py-1.5 text-xs font-extrabold text-navy shadow">
          {shop.cashback}
        </span>
        <div className="absolute -bottom-0 left-5 flex translate-y-1/2 items-center gap-3">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-black shadow-lg"
            style={{ background: shop.logoBg, color: shop.logoColor }}
          >
            {shop.logoText}
          </span>
        </div>
      </div>
      <div className="px-5 pb-5 pt-9">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-lg font-extrabold text-navy">{shop.name}</h3>
          <span className="flex items-center gap-1 text-sm font-bold text-navy">
            <svg width="15" height="15" viewBox="0 0 24 24" className="fill-amber-400">
              <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2Z" />
            </svg>
            {shop.rating}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-sm text-muted">{shop.tagline}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {shop.tags.map((t) => (
            <span key={t} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-navy">
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-light/60 px-4 py-3">
          <div>
            <p className="text-[15px] font-extrabold text-brand">{offerTitle(best)}</p>
            <p className="text-xs font-semibold text-muted">{offerSubtitle(best)}</p>
          </div>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white transition-transform group-hover:translate-x-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ---------- Offer ticket (webshop detail) ---------- */
export function OfferTicket({ shop, offer }: { shop: Webshop; offer: Offer }) {
  const { unlockOffer, pushToast, balance } = useShopBonus();
  const [showTerms, setShowTerms] = useState(false);
  const [unlockedCode, setUnlockedCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const notEnough = balance < offer.cost;

  const handleUnlock = () => {
    if (unlockedCode) return;
    setBusy(true);
    window.setTimeout(() => {
      const res = unlockOffer(shop.slug, offer.id);
      setBusy(false);
      if (res.ok && res.code) {
        setUnlockedCode(res.code);
        pushToast({
          title: "Voucher ontgrendeld!",
          message: `Code ${res.code} toegevoegd aan Mijn voordelen.`,
          kind: "success",
        });
      } else if (res.reason === "onvoldoende-tegoed") {
        pushToast({
          title: "Onvoldoende tegoed",
          message: `Je hebt ${formatEuro(offer.cost)} tegoed nodig. Spaar verder bij webshops!`,
          kind: "error",
        });
      } else {
        pushToast({ title: "Er ging iets mis", message: res.reason ?? "Probeer opnieuw.", kind: "error" });
      }
    }, 700);
  };

  return (
    <div className="lift relative overflow-hidden rounded-3xl bg-white shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)]">
      {/* Blue ticket stub */}
      <div className="absolute bottom-16 right-0 top-0 hidden w-[104px] flex-col items-center justify-center bg-gradient-to-b from-[#2b94ff] to-[#0b63ee] sm:flex">
        <div className="ticket-notch -top-[11px]" />
        <div className="ticket-notch -bottom-[11px]" />
        <div className="ticket-divider absolute bottom-2 left-0 top-2 w-[2px]" />
        <span className="text-[56px] font-black leading-none text-white/95">
          {offer.type === "percent" ? "%" : "€"}
        </span>
      </div>

      <div className="p-6 sm:pr-[128px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-[13px] font-extrabold text-mint-dark">
          <svg width="14" height="14" viewBox="0 0 24 24" className="fill-current">
            <path d="M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a1 1 0 0 0-1 1v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8ZM8.5 10a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5Z" />
          </svg>
          {formatEuro(offer.cost)} tegoed nodig
        </span>
        <h3 className="mt-3 text-[34px] font-black leading-none tracking-tight text-navy">
          {offerTitle(offer)}
        </h3>
        <p className="mt-2 text-[15px] font-medium text-navy/80">{offerSubtitle(offer)}</p>

        {unlockedCode ? (
          <div className="mt-5 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 p-4 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-green-700">Jouw code</p>
            <p className="mt-1 text-xl font-black tracking-widest text-navy">{unlockedCode}</p>
            <Link
              href="/mijn-voordelen"
              className="mt-2 inline-block text-sm font-bold text-brand hover:underline"
            >
              Bekijk in Mijn voordelen →
            </Link>
          </div>
        ) : (
          <button
            onClick={handleUnlock}
            disabled={busy}
            className={`mt-5 flex w-full items-center justify-center gap-2.5 rounded-2xl px-5 py-3.5 text-[15px] font-extrabold text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)] transition ${
              notEnough ? "bg-slate-300 shadow-none" : "bg-brand hover:bg-brand-dark"
            } disabled:opacity-70`}
          >
            {busy ? (
              <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.2" />
                <circle cx="12" cy="15" r="1.6" fill="currentColor" />
              </svg>
            )}
            {busy ? "Bezig met ontgrendelen…" : `Ontgrendel voor ${formatEuro(offer.cost)} tegoed`}
          </button>
        )}

        <button
          onClick={() => setShowTerms((v) => !v)}
          className="mt-3.5 flex w-full items-center justify-center gap-2 text-sm font-bold text-brand hover:underline"
        >
          Bekijk voorwaarden
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            className={`transition-transform ${showTerms ? "rotate-90" : ""}`}
          >
            <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {showTerms && (
          <ul className="mt-2 space-y-1.5 rounded-2xl bg-mist p-4 text-[13px] font-medium text-muted">
            {offer.conditions.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {c}
              </li>
            ))}
            <li className="flex gap-2">
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              Geldig {offer.validityDays} dagen na ontgrendelen. Nog {offer.codesLeft} codes beschikbaar.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}

/* ---------- Section heading ---------- */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-brand">{children}</p>
  );
}
