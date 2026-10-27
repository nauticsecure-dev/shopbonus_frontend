"use client";

import Link from "next/link";
import { useState } from "react";
import { Eyebrow } from "@/components/Cards";
import { formatEuro } from "@/fixtures/dummy";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export default function MijnVoordelenPage() {
  const { balance, vouchers, transactions, copyCode, justCopied, pushToast } = useShopBonus();
  const [tab, setTab] = useState<"vouchers" | "transacties">("vouchers");
  const [filter, setFilter] = useState<"alle" | "actief" | "verlopen">("alle");

  const shown =
    filter === "alle" ? vouchers : vouchers.filter((v) => (filter === "actief" ? v.status === "active" : v.status !== "active"));

  const progress = Math.min(100, Math.round((balance / 10) * 100));

  const giftVoucher = (name: string) => {
    pushToast({
      title: "Cadeau-link aangemaakt",
      message: `Deellink voor ${name} gekopieerd (demo).`,
      kind: "info",
    });
  };

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[120px] h-[30rem] w-[30rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <Eyebrow>Jouw tegoed. Jouw voordeel.</Eyebrow>
            <h1 className="mt-2 text-[clamp(2.6rem,6vw,4.2rem)] font-black leading-none tracking-tight">
              <span className="text-navy">Mijn</span> <span className="text-brand">voordelen</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              Gebruik je ShopBonus-tegoed voor exclusieve kortingsvouchers bij honderden webshops.
            </p>
          </div>

          {/* Wallet card */}
          <div className="rounded-[1.75rem] border border-blue-100 bg-white/80 p-6 shadow-[0_18px_50px_-20px_rgba(11,116,255,0.4)] backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="grid h-[72px] w-[72px] place-items-center rounded-3xl bg-gradient-to-br from-[#2b94ff] to-[#0b63ee] text-white shadow-lg">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path d="M4 9.5A2.5 2.5 0 0 1 6.5 7h9L18 4.5A1.5 1.5 0 0 1 20.4 6l-1.2 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="3" y="9" width="18" height="11" rx="3" fill="white" opacity="0.25" />
                    <rect x="12" y="12.5" width="7" height="5" rx="1.5" fill="white" />
                    <circle cx="15.5" cy="15" r="0.9" fill="#0b63ee" />
                  </svg>
                </span>
                <div>
                  <p className="font-bold text-navy">Mijn ShopBonus-tegoed</p>
                  <p className="text-[44px] font-black leading-none tracking-tight text-navy">
                    {formatEuro(balance)}
                  </p>
                  <p className="mt-1 text-sm text-muted">Alleen te gebruiken voor kortingsvouchers.</p>
                </div>
              </div>
              <span className="hidden rotate-[8deg] rounded-2xl bg-gradient-to-br from-[#2b94ff] to-[#0b63ee] p-4 text-3xl font-black text-white shadow-lg sm:block">
                %
              </span>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <p className="whitespace-nowrap text-sm font-bold text-navy">
                {formatEuro(Math.min(balance, 10))} <span className="font-medium text-muted">van €10</span>
              </p>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2b94ff] to-[#0b63ee] transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm font-bold text-navy">{progress}%</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => setTab("vouchers")}
            className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 font-extrabold transition ${
              tab === "vouchers" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" stroke="currentColor" strokeWidth="2" />
              <path d="M13 7v2m0 6v2m0-8.5v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="1 3" />
            </svg>
            Mijn vouchers
          </button>
          <button
            onClick={() => setTab("transacties")}
            className={`flex items-center gap-2.5 rounded-full px-8 py-3.5 font-extrabold transition ${
              tab === "transacties" ? "bg-brand text-white shadow-[0_12px_28px_-10px_rgba(11,116,255,0.7)]" : "bg-white text-navy shadow-sm hover:bg-brand-light"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="4" y="3" width="16" height="18" rx="2.5" stroke="currentColor" strokeWidth="2" />
              <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Transacties
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          {/* Main column */}
          <div className="lg:col-span-2">
            {tab === "vouchers" ? (
              <>
                <div className="mb-4 flex gap-2">
                  {([["alle", "Alle"], ["actief", "Actief"], ["verlopen", "Verlopen / gebruikt"]] as const).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => setFilter(v)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                        filter === v ? "bg-navy text-white" : "bg-white text-muted hover:text-navy"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <div className="space-y-5">
                  {shown.length === 0 && (
                    <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                      <p className="text-5xl">🎟️</p>
                      <h3 className="mt-4 text-xl font-black text-navy">Nog geen vouchers hier</h3>
                      <p className="mt-2 text-muted">Ontgrendel je eerste voucher met je tegoed.</p>
                      <Link href="/webshops" className="mt-5 inline-block rounded-2xl bg-brand px-6 py-3 font-extrabold text-white">
                        Ontdek webshops
                      </Link>
                    </div>
                  )}
                  {shown.map((v) => {
                    const active = v.status === "active";
                    return (
                      <article
                        key={v.id}
                        className={`overflow-hidden rounded-3xl bg-white shadow-[0_10px_36px_-16px_rgba(10,27,63,0.22)] ${!active ? "opacity-80" : ""}`}
                      >
                        <div className="flex flex-col gap-5 p-5 sm:flex-row">
                          {/* Image + logo */}
                          <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-2xl sm:h-auto sm:min-h-[190px] sm:w-52">
                            <img src={v.image} alt={v.shopName} className={`h-full w-full object-cover ${!active ? "grayscale-[35%]" : ""}`} />
                            <span
                              className="absolute bottom-3 left-3 grid h-14 w-14 place-items-center rounded-full text-lg font-black shadow-lg"
                              style={{ background: v.logoBg, color: v.logoColor }}
                            >
                              {v.logoText}
                            </span>
                          </div>
                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <h3 className="text-xl font-black text-navy">{v.shopName}</h3>
                            <p className="text-sm text-muted">{v.tagline}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {v.tags.map((t) => (
                                <span key={t} className="rounded-full bg-mist px-3 py-1 text-xs font-bold text-navy">
                                  {t}
                                </span>
                              ))}
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                              <button onClick={() => giftVoucher(v.shopName)} className="flex items-center gap-1.5 font-bold text-brand hover:underline">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" /><path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                                Cadeau doen
                              </button>
                              <span className="h-4 w-px bg-slate-200" />
                              <button
                                onClick={() => pushToast({ title: "Hulp onderweg", message: "Ons team neemt contact met je op (demo).", kind: "info" })}
                                className="flex items-center gap-1.5 font-bold text-brand hover:underline"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M9.5 9.3a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9.9-.9 1.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="17" r="1.2" fill="currentColor" /></svg>
                                Probleem met code?
                              </button>
                            </div>
                          </div>
                          {/* Discount */}
                          <div className="flex shrink-0 flex-row items-center gap-4 sm:flex-col sm:justify-center sm:gap-1">
                            <div className={`rounded-2xl px-5 py-3 text-center ${active ? "bg-brand-light" : "bg-slate-100"}`}>
                              <p className={`text-[32px] font-black leading-none ${active ? "text-brand" : "text-muted"}`}>
                                {v.type === "percent" ? `${v.value}%` : `€${v.value}`}
                              </p>
                              <p className={`text-sm font-extrabold ${active ? "text-brand" : "text-muted"}`}>korting</p>
                            </div>
                            <div className="text-sm font-semibold text-navy">
                              <p>vanaf €{v.minOrder}</p>
                              <p className="text-muted">max. €{v.maxDiscount}</p>
                            </div>
                          </div>
                          {/* Status + code */}
                          <div className="flex shrink-0 flex-col justify-center gap-2 border-t border-slate-100 pt-4 sm:w-56 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                            {active ? (
                              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-mint px-3.5 py-1.5 text-sm font-extrabold text-green-700">
                                <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Actief
                              </span>
                            ) : (
                              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-extrabold text-muted">
                                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Verlopen
                              </span>
                            )}
                            <p className="flex items-center gap-2 text-sm font-bold text-navy">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 7v5l3.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                              {active ? `Geldig nog ${v.daysLeft} dagen` : v.expiryLabel}
                            </p>
                            {active && <p className="text-sm text-muted">{v.expiryLabel}</p>}
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`flex-1 truncate rounded-xl border-2 border-dashed px-3 py-2.5 text-center font-black tracking-wider ${active ? "border-blue-200 bg-blue-50/50 text-navy" : "border-slate-200 bg-slate-50 text-muted"}`}>
                                {v.code}
                              </span>
                              <button
                                onClick={() => active && copyCode(v.code)}
                                disabled={!active}
                                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-sm font-extrabold text-white transition ${active ? "bg-brand hover:bg-brand-dark" : "cursor-not-allowed bg-slate-200 text-muted"}`}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="8" y="8" width="12" height="12" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" stroke="currentColor" strokeWidth="2" /></svg>
                                {justCopied === v.code ? "Gekopieerd!" : "Kopieer code"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
                <div className="border-b border-slate-100 px-6 py-5">
                  <h3 className="text-lg font-black text-navy">Alle transacties</h3>
                  <p className="text-sm text-muted">{transactions.length} transacties in je walletgeschiedenis.</p>
                </div>
                {transactions.map((t) => (
                  <div key={t.id} className="flex items-center gap-4 border-b border-slate-50 px-6 py-4 last:border-0 hover:bg-mist/50">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-black ${t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                      {t.type === "credit" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-navy">{t.title}</p>
                      <p className="text-sm text-muted">{t.subtitle} • {t.date}</p>
                    </div>
                    <p className={`text-lg font-black ${t.type === "credit" ? "text-green-600" : "text-navy"}`}>
                      {t.type === "credit" ? "+" : "−"} {formatEuro(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-5">
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-navy">Recente walletactiviteit</h3>
                <button onClick={() => setTab("transacties")} className="flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                  Alle transacties
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {transactions.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-2xl bg-mist/60 p-3.5">
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-xl font-black ${t.type === "credit" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                      {t.type === "credit" ? "+" : "−"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-navy">{t.title}</p>
                      <p className="truncate text-[13px] text-muted">{t.subtitle}</p>
                      <p className="text-[13px] text-muted">{t.date}</p>
                    </div>
                    <p className={`text-[17px] font-black ${t.type === "credit" ? "text-green-600" : "text-navy"}`}>
                      {t.type === "credit" ? "+" : "−"} {formatEuro(t.amount)}
                    </p>
                  </div>
                ))}
              </div>
              <Link href="/webshops" className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-light/70 p-4 transition hover:bg-brand-light">
                <span className="grid h-14 w-14 shrink-0 rotate-[-8deg] place-items-center rounded-2xl bg-brand text-2xl font-black text-white">
                  %
                </span>
                <div className="flex-1">
                  <p className="font-black text-navy">Meer voordeel?</p>
                  <p className="text-[13px] leading-snug text-muted">Ontdek nieuwe webshops en verdien meer ShopBonus-tegoed.</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-brand">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
