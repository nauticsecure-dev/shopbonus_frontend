import Link from "next/link";
import {
  discountCodes,
  formatEuro,
  popularShops,
  user,
  webshops,
} from "@/fixtures/dummy";
import { SearchBar, CodeRow } from "@/features/home/components/HomeClient";

export default function HomePage() {
  // Server-side dummy payload for cards
  const wallet = {
    balance: user.balance,
    nextGift: 50,
    remaining: Math.max(0, 50 - user.balance),
    progress: Math.min(100, Math.round((user.balance / 50) * 100)),
  };

  const featuredCodes = discountCodes.slice(0, 2);
  const featuredShops = popularShops;

  return (
    <div className="relative overflow-hidden bg-[#f4f8ff]">
      {/* Soft hero background with abstract shapes */}
      <section className="relative isolate min-h-[640px] sm:min-h-[700px]">
        {/* Full-bleed background image + left→right overlay */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <img
            src="https://images.pexels.com/photos/7836571/pexels-photo-7836571.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=900&w=1800"
            alt=""
            className="h-full w-full scale-105 object-cover object-[center_30%]"
          />
          {/* Left-to-right overlay: solid on left for text, fades to soft blue on right */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                linear-gradient(
                  90deg,
                  rgba(244,248,255,0.97) 0%,
                  rgba(244,248,255,0.92) 28%,
                  rgba(238,245,255,0.72) 48%,
                  rgba(219,234,254,0.45) 68%,
                  rgba(191,219,254,0.28) 100%
                ),
                linear-gradient(
                  180deg,
                  rgba(244,248,255,0.55) 0%,
                  rgba(244,248,255,0.15) 40%,
                  rgba(244,248,255,0.55) 85%,
                  rgba(244,248,255,0.95) 100%
                )
              `,
            }}
          />
          {/* Soft brand tint on the right for depth */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-brand/10" />
        </div>

        {/* Decorative blobs on top of overlay */}
        <div className="page-blob right-[8%] top-8 h-64 w-64 bg-emerald-200/20" />
        <div className="page-blob left-[-5%] top-40 h-72 w-72 bg-blue-200/25" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-16">
          {/* LEFT copy */}
          <div className="relative z-10">
            <h1 className="text-[clamp(2.4rem,5.5vw,3.75rem)] font-black leading-[1.05] tracking-tight text-navy">
              Shop zoals je altijd doet.
              <br />
              <span className="text-brand">Spaar voor wat je écht wilt.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
              Ontdek korting, cashback en vouchers bij jouw favoriete webshops.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/webshops"
                className="inline-flex items-center gap-2.5 rounded-2xl bg-brand px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.65)] transition hover:bg-brand-dark"
              >
                Ontdek aanbiedingen
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/hoe-werkt-het"
                className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-blue-200 bg-white/70 px-7 py-3.5 text-[15px] font-extrabold text-navy backdrop-blur transition hover:border-brand hover:text-brand"
              >
                <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7L8 5Z" />
                  </svg>
                </span>
                Hoe werkt het?
              </Link>
            </div>

            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {[
                "Gratis en vrijblijvend",
                "Duizenden webshops",
                "Echte cashback",
                "Veilig en betrouwbaar",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-green-100 text-green-600">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT 3D cards visual */}
          <div className="relative mx-auto h-[420px] w-full max-w-lg lg:mx-0">
            {/* Floating gold coins (CSS) */}
            <span className="absolute left-[8%] top-[12%] z-20 grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-lg font-black text-amber-900 shadow-lg rotate-[-12deg]">
              €
            </span>
            <span className="absolute right-[6%] top-[8%] z-20 grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-base font-black text-amber-900 shadow-lg rotate-[18deg]">
              €
            </span>
            <span className="absolute bottom-[28%] right-[2%] z-30 grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-xl font-black text-amber-900 shadow-xl rotate-[8deg]">
              €
            </span>
            <span className="absolute bottom-[18%] left-[18%] z-10 grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-sm font-black text-amber-900 shadow-md rotate-[-20deg]">
              €
            </span>

            {/* Shopping bags decoration */}
            <div className="absolute bottom-[12%] left-[4%] z-0 opacity-90">
              <svg width="70" height="80" viewBox="0 0 70 80" fill="none">
                <path d="M12 24h46l-4 48H16L12 24Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
                <path d="M24 24V18a11 11 0 0 1 22 0v6" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
                <path d="M8 20h18l3 52H11L8 20Z" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="2" />
                <path d="M14 20v-4a7 7 0 0 1 14 0v4" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>

            {/* Main blue balance card */}
            <div className="absolute left-[8%] top-[14%] z-20 w-[280px] rotate-[-6deg] rounded-[1.75rem] bg-gradient-to-br from-[#1d8bff] to-[#0b5fe8] p-6 text-white shadow-[0_30px_60px_-20px_rgba(11,95,232,0.55)] sm:w-[300px]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold tracking-tight">ShopBonus</span>
                <span className="grid h-5 w-5 place-items-center rounded bg-white/20 text-[9px]">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z" />
                  </svg>
                </span>
              </div>
              <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-100">Jouw saldo</p>
              <p className="mt-1 text-[42px] font-black leading-none tracking-tight">
                {formatEuro(wallet.balance)}
              </p>
              <Link
                href="/mijn-voordelen"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-green-600"
              >
                Voucher kiezen
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Gift card */}
            <div className="absolute bottom-[8%] right-[0%] z-30 w-[200px] rotate-[8deg] rounded-[1.5rem] bg-white p-5 shadow-[0_28px_50px_-18px_rgba(10,27,63,0.35)] sm:w-[220px]">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-muted">Cadeaubon</p>
                  <p className="mt-1 text-3xl font-black text-navy">€ 25</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-light text-brand">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>

            {/* Annotation */}
            <p className="absolute right-0 top-0 max-w-[140px] text-right text-xs font-semibold italic leading-snug text-muted">
              Spaar voor cadeaubonnen van jouw favoriete winkels
            </p>
            <svg className="absolute right-[110px] top-10 text-muted/50" width="50" height="40" viewBox="0 0 50 40" fill="none">
              <path d="M2 2c20 4 35 12 42 32" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" />
              <path d="M40 28l6 6-8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SearchBar />
        </div>
      </section>

      {/* Popular webshops */}
      <section className="relative mx-auto max-w-7xl px-4 pt-14 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">
            Populaire webshops
          </h2>
          <Link href="/webshops" className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
            Bekijk alle webshops
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featuredShops.map((shop) => (
            <Link
              key={shop.slug}
              href={`/webshops/${shop.slug}`}
              className="group lift overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_-14px_rgba(10,27,63,0.2)]"
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={shop.image}
                  alt={shop.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <span
                  className={`absolute left-3 top-3 rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow ${
                    shop.badgeTone === "green"
                      ? "bg-green-100 text-green-700"
                      : "bg-white/95 text-navy"
                  }`}
                >
                  {shop.badge}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 px-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-extrabold text-navy">{shop.name}</p>
                  <p className="truncate text-sm text-muted">{shop.category}</p>
                </div>
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-blue-100 bg-white text-navy transition group-hover:border-brand group-hover:bg-brand group-hover:text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How it works + bottom cards */}
      <section className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-black tracking-tight text-navy sm:text-3xl">
            Zo werkt ShopBonus
          </h2>
          <p className="text-sm font-semibold text-muted">In 3 simpele stappen naar meer voordeel</p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              n: "1",
              title: "Ontdek voordeel",
              desc: "Zoek je favoriete webshop en bekijk de nieuwste kortingscodes en cashback aanbiedingen.",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
                  <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              n: "2",
              title: "Shop via ShopBonus",
              desc: "Klik door naar de webshop en shop zoals je gewend bent. De korting wordt direct toegepast of je ontvangt cashback.",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <path d="M6 8h12l1 12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8Z" stroke="currentColor" strokeWidth="2" />
                  <path d="M9 10V6.5a3 3 0 0 1 6 0V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              n: "3",
              title: "Spaar voor vouchers",
              desc: "Je cashback wordt automatisch aan je ShopBonus-wallet toegevoegd. Wissel je saldo in voor cadeaubonnen.",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-brand">
                  <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
                  <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              ),
            },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-light">
                  {s.icon}
                </span>
                <div>
                  <p className="font-black text-navy">
                    <span className="mr-1.5 text-brand">{s.n}</span>
                    {s.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom two cards */}
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          {/* Active discount codes */}
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-navy">Actuele kortingscodes</h3>
              <Link href="/kortingscodes" className="flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                Bekijk alle kortingscodes
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {featuredCodes.map((c) => (
                <CodeRow key={c.id} code={c} />
              ))}
            </div>
          </div>

          {/* Wallet card */}
          <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xl font-black text-navy">Jouw ShopBonus-wallet</h3>
              <Link href="/mijn-voordelen" className="flex items-center gap-1 text-sm font-bold text-brand hover:underline">
                Bekijk transacties
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            <div className="mt-5 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="6" width="18" height="13" rx="3" stroke="currentColor" strokeWidth="2" />
                      <path d="M3 10h18" stroke="currentColor" strokeWidth="2" />
                      <circle cx="16.5" cy="14.5" r="1.4" fill="currentColor" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-bold text-muted">Huidig saldo</p>
                    <p className="text-3xl font-black tracking-tight text-navy">
                      {formatEuro(wallet.balance)}
                    </p>
                  </div>
                </div>
                <Link
                  href="/mijn-voordelen"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#22c55e] px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-green-600"
                >
                  Voucher kiezen
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>

              <div className="mt-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-green-600">
                    <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
                    <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                  Spaar nog {formatEuro(wallet.remaining)} voor een cadeaubon van € {wallet.nextGift}
                </div>
                <div className="mt-2.5 flex items-center gap-3">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/80">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all"
                      style={{ width: `${wallet.progress}%` }}
                    />
                  </div>
                  <span className="text-sm font-extrabold text-navy">{wallet.progress}%</span>
                </div>
              </div>
            </div>

            <p className="mt-4 text-center text-xs text-muted">
              Demo-saldo · {webshops.length} webshops aangesloten
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
