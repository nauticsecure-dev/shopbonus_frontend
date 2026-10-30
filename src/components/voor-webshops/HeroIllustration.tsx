"use client";

/** Promotional artwork only — not a live performance dashboard. */
export default function HeroIllustration({ note }: { note?: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-hidden>
      <span className="sr-only">{note || "Promotionele illustratie"}</span>

      {/* Soft glow */}
      <div className="pointer-events-none absolute -inset-8 rounded-[40%] bg-gradient-to-br from-brand/25 via-sky-200/40 to-transparent blur-2xl" />

      {/* Floating chart */}
      <div className="merchant-float absolute -left-2 top-8 z-20 hidden w-36 rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_18px_40px_-18px_rgba(10,27,63,0.45)] sm:block">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Bereik</p>
        <svg viewBox="0 0 120 48" className="mt-1 h-12 w-full text-brand" fill="none">
          <path
            d="M4 40 C24 36, 28 22, 44 24 S72 38, 88 18 S108 10, 116 8"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M4 40 C24 36, 28 22, 44 24 S72 38, 88 18 S108 10, 116 8 V48 H4 Z" fill="url(#chartFill)" opacity="0.25" />
          <defs>
            <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b74ff" />
              <stop offset="100%" stopColor="#0b74ff" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* New order toast */}
      <div className="merchant-float-delay absolute -right-1 top-16 z-30 flex items-center gap-2.5 rounded-2xl border border-white/80 bg-white px-3 py-2.5 shadow-[0_16px_36px_-14px_rgba(10,27,63,0.4)]">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-mint text-mint-dark">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M6 6h15l-1.5 9h-12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="9" cy="20" r="1.5" fill="currentColor" />
            <circle cx="17" cy="20" r="1.5" fill="currentColor" />
          </svg>
        </span>
        <div>
          <p className="text-xs font-extrabold text-navy">Nieuwe bestelling</p>
          <p className="text-[10px] font-semibold text-muted">Illustratief voorbeeld</p>
        </div>
      </div>

      {/* Coins */}
      <div className="merchant-float absolute bottom-16 -left-4 z-20 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-sm font-black text-amber-950 shadow-lg">
        €
      </div>
      <div className="merchant-float-delay absolute bottom-28 right-2 z-20 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-xs font-black text-amber-950 shadow-md">
        €
      </div>

      {/* Browser card */}
      <div className="relative z-10 overflow-hidden rounded-[1.75rem] border border-white/90 bg-white shadow-[0_30px_60px_-24px_rgba(10,27,63,0.45)]">
        <div className="flex items-center gap-1.5 border-b border-blue-50 bg-[#f7faff] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 flex-1 truncate rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-muted shadow-sm">
            shopbonus.nl/webshops
          </span>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-brand">Jouw webshop</p>
              <p className="text-lg font-extrabold text-navy">Studio & Co</p>
            </div>
            <span className="rounded-full bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand">ShopBonus</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.pexels.com/photos/2529148/pexels-photo-2529148.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
              alt=""
              className="aspect-square rounded-2xl object-cover"
              loading="lazy"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop"
              alt=""
              className="aspect-square rounded-2xl object-cover"
              loading="lazy"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold text-violet-700">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-violet-600 text-[9px] text-white">%</span>
              Cashback
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-800">
              <span className="grid h-4 w-4 place-items-center rounded-full bg-brand text-[9px] text-white">#</span>
              Kortingscode
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
