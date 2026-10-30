import Link from "next/link";
import type { HomepageContent } from "@/lib/homepageDefaults";

type Props = {
  content: HomepageContent["hero"];
  /** When true, render only the floating wallet artwork (CMS edit layout). */
  artworkOnly?: boolean;
};

function HeroArtwork({ content }: { content: HomepageContent["hero"] }) {
  return (
    <div className="relative mx-auto h-[420px] w-full max-w-lg lg:mx-0" aria-hidden>
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

      <div className="absolute bottom-[12%] left-[4%] z-0 opacity-90">
        <svg width="70" height="80" viewBox="0 0 70 80" fill="none">
          <path d="M12 24h46l-4 48H16L12 24Z" fill="#dbeafe" stroke="#93c5fd" strokeWidth="2" />
          <path d="M24 24V18a11 11 0 0 1 22 0v6" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round" />
          <path d="M8 20h18l3 52H11L8 20Z" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="2" />
          <path d="M14 20v-4a7 7 0 0 1 14 0v4" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>

      <div className="absolute left-[8%] top-[14%] z-20 w-[280px] rotate-[-6deg] rounded-[1.75rem] bg-gradient-to-br from-[#1d8bff] to-[#0b5fe8] p-6 text-white shadow-[0_30px_60px_-20px_rgba(11,95,232,0.55)] sm:w-[300px]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-tight">ShopBonus</span>
          <span className="grid h-5 w-5 place-items-center rounded bg-white/20 text-[9px]">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <path d="M4 8h16l-1.2 11a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 8Z" />
            </svg>
          </span>
        </div>
        <p className="mt-5 text-xs font-bold uppercase tracking-wider text-blue-100">Voorbeeld saldo</p>
        <p className="mt-1 text-[42px] font-black leading-none tracking-tight">
          {content.promo_balance_example}
        </p>
        <Link
          href="/mijn-voordelen"
          className="pointer-events-auto mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-3 text-sm font-extrabold text-white shadow-lg transition hover:bg-green-600"
        >
          Voucher kiezen
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14m-6-6 6 6-6 6"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div className="absolute bottom-[8%] right-[0%] z-30 w-[200px] rotate-[8deg] rounded-[1.5rem] bg-white p-5 shadow-[0_28px_50px_-18px_rgba(10,27,63,0.35)] sm:w-[220px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted">Cadeaubon</p>
            <p className="mt-1 text-3xl font-black text-navy">{content.promo_voucher_example}</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-light text-brand">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="8" width="18" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
              <path
                d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8M12 8v13M12 8s-4 0-5.5-1.5A1.5 1.5 0 0 1 8 4c1 0 3 2 4 4Zm0 0s4 0 5.5-1.5A1.5 1.5 0 0 0 16 4c-1 0-3 2-4 4Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
        <div className="mt-4 flex justify-end">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-brand text-white">
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

      <p className="absolute right-0 top-0 max-w-[140px] text-right text-xs font-semibold italic leading-snug text-muted">
        {content.artwork_note}
      </p>
      <svg className="absolute right-[110px] top-10 text-muted/50" width="50" height="40" viewBox="0 0 50 40" fill="none">
        <path
          d="M2 2c20 4 35 12 42 32"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          strokeLinecap="round"
        />
        <path d="M40 28l6 6-8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function HeroSection({ content, artworkOnly = false }: Props) {
  if (artworkOnly) {
    return <HeroArtwork content={content} />;
  }

  const [line1, line2] = content.heading.split("\n");

  return (
    <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-6 pt-12 sm:px-6 lg:grid-cols-2 lg:px-8 lg:pt-16">
      <div className="relative z-10">
        <h1
          className="text-[clamp(2.4rem,5.5vw,3.75rem)] font-black leading-[1.05] tracking-tight text-navy"
          data-cms-field="hero.heading"
        >
          {line1}
          {line2 ? (
            <>
              <br />
              <span className="text-brand">{line2}</span>
            </>
          ) : null}
        </h1>
        <p className="mt-5 max-w-md text-lg leading-relaxed text-muted" data-cms-field="hero.subtitle">
          {content.subtitle}
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href={content.primary_cta.href}
            className="inline-flex items-center gap-2.5 rounded-2xl bg-brand px-7 py-3.5 text-[15px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.65)] transition hover:bg-brand-dark"
          >
            {content.primary_cta.label}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 12h14m-6-6 6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <Link
            href={content.secondary_cta.href}
            className="inline-flex items-center gap-2.5 rounded-2xl border-2 border-blue-200 bg-white/70 px-7 py-3.5 text-[15px] font-extrabold text-navy backdrop-blur transition hover:border-brand hover:text-brand"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full bg-brand text-white">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M8 5v14l11-7L8 5Z" />
              </svg>
            </span>
            {content.secondary_cta.label}
          </Link>
        </div>

        <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
          {content.trust.map((t) => (
            <li key={t} className="flex items-center gap-2 text-sm font-semibold text-navy">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-green-100 text-green-600">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="m5 13 4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {t}
            </li>
          ))}
        </ul>
      </div>

      <HeroArtwork content={content} />
    </div>
  );
}
