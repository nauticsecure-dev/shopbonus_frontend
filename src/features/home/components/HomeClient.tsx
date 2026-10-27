"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DiscountCode } from "@/fixtures/dummy";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export function SearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();
  return (
    <form
      className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-blue-100 bg-white p-2 shadow-[0_16px_40px_-16px_rgba(10,27,63,0.28)]"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/webshops?q=${encodeURIComponent(q)}`);
      }}
    >
      <span className="pl-4 text-muted">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.3" />
          <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Zoek een webshop of aanbieding…"
        className="w-full bg-transparent py-2.5 text-[15px] font-medium text-navy placeholder:text-muted/70 focus:outline-none"
      />
      <button className="shrink-0 rounded-full bg-brand px-7 py-3 text-sm font-extrabold text-white transition hover:bg-brand-dark">
        Zoeken
      </button>
    </form>
  );
}

export function CodeRow({ code }: { code: DiscountCode }) {
  const { copyCode, justCopied } = useShopBonus();
  const copied = justCopied === code.code;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <img
          src={code.image}
          alt={code.shopName}
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <p className="truncate font-extrabold text-navy">{code.title}</p>
          <p className="truncate text-xs text-muted">{code.meta}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => copyCode(code.code)}
          className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 font-black tracking-wider text-navy transition hover:border-brand"
        >
          {code.code}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-muted">
            <rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>
        <Link
          href={`/webshops/${code.shopSlug}`}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-dark"
        >
          {copied ? "Gekopieerd!" : "Naar webshop"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M14 5h5v5M19 5 10 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M11 5H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
