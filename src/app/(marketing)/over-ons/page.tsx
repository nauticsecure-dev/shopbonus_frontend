import Link from "next/link";
import { Eyebrow } from "@/components/Cards";
import { images } from "@/fixtures/dummy";

export default function OverOnsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-100/60">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Eyebrow>Over ShopBonus</Eyebrow>
            <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-[1.05] tracking-tight text-navy">
              Samen maken we online shoppen <span className="text-brand">voordeliger.</span>
            </h1>
            <p className="mt-5 max-w-md leading-relaxed text-muted">
              Wij verbinden consumenten en webshops met aantrekkelijke aanbiedingen,
              cashback en vouchers. Eenvoudig, transparant en voor beide kanten waardevol.
            </p>
            <a href="#verhaal" className="mt-5 inline-flex items-center gap-2 border-b-2 border-brand pb-1 font-bold text-brand">
              Ontdek ons verhaal
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] shadow-2xl">
              <img src={images.coffeeLaptop} alt="Online shoppen met laptop" className="h-96 w-full object-cover" />
            </div>
            <div className="absolute right-5 top-5 max-w-[220px] rounded-2xl bg-white/95 p-4 shadow-xl backdrop-blur">
              <div className="flex items-start gap-2.5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="shrink-0 text-brand">
                  <path d="M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a1 1 0 0 0-1 1v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8Z" stroke="currentColor" strokeWidth="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                </svg>
                <div>
                  <p className="text-sm font-extrabold text-navy">Eerlijk voordeel</p>
                  <p className="text-xs leading-snug text-muted">Aantrekkelijke deals en cashback, altijd transparant.</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 left-5 flex items-center gap-3 rounded-2xl bg-white p-4 shadow-xl">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-xl font-black text-white">70%</span>
              <div>
                <p className="text-sm font-extrabold text-navy">van de commissie</p>
                <p className="text-xs text-muted">gaat terug naar jou</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Story */}
      <section id="verhaal" className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] shadow-xl">
          <img src={images.officeImg} alt="ShopBonus team" className="h-96 w-full object-cover" />
        </div>
        <div>
          <Eyebrow>Ons verhaal</Eyebrow>
          <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-navy sm:text-5xl">
            Een goed idee verdient <span className="text-brand">meer dan korting.</span>
          </h2>
          <div className="mt-5 space-y-4 leading-relaxed text-muted">
            <p>Wij geloven dat online shoppen leuker, makkelijker en eerlijker kan.</p>
            <p>
              ShopBonus is ontstaan uit de overtuiging dat consumenten en webshops dichter
              bij elkaar kunnen komen.
            </p>
            <p>
              Met aantrekkelijke aanbiedingen, cashback en vouchers bouwen we samen aan een
              online wereld waarin beide kanten meerwaarde ervaren.
            </p>
          </div>
        </div>
      </section>

      {/* Revenue model */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b63ee] to-[#0b3fa0] p-8 text-white sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-200">
                Transparant over ons verdienmodel
              </p>
              <h2 className="mt-4 text-4xl font-black leading-tight sm:text-5xl">
                Eerlijk verdeeld.<br />
                <span className="text-sky-300">Meer waarde</span><br />
                voor iedereen.
              </h2>
            </div>
            <div>
              <p className="text-blue-100/90">
                Wanneer je via ShopBonus naar een webshop gaat en daar iets koopt, ontvangen
                wij een commissie. Deze commissie verdelen we eerlijk tussen de consument
                en ShopBonus.
              </p>
              <div className="mt-5 flex gap-3">
                <div className="flex-1 rounded-2xl bg-white p-5 text-navy">
                  <p className="text-4xl font-black text-brand">70%</p>
                  <p className="mt-1 font-extrabold">voor de consument</p>
                  <p className="mt-1 text-xs leading-snug text-muted">
                    Het grootste deel van de commissie gaat terug naar jou, in de vorm van
                    cashback of andere voordelen.
                  </p>
                </div>
                <div className="flex-1 rounded-2xl border border-white/30 bg-navy/40 p-5">
                  <p className="text-4xl font-black">30%</p>
                  <p className="mt-1 font-extrabold">voor ShopBonus</p>
                  <p className="mt-1 text-xs leading-snug text-blue-100/80">
                    Met dit deel kunnen wij onze service blijven verbeteren en verder groeien.
                  </p>
                </div>
              </div>
              <p className="mt-3 flex items-center gap-2 text-xs text-blue-100/70">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" /><path d="M12 8h.01M12 11v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                Standaardverdeling van de toepasselijke commissie. Afwijkingen mogelijk.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <Eyebrow>Onze waarden</Eyebrow>
          <h2 className="mt-3 text-4xl font-black leading-tight text-navy sm:text-5xl">
            Waar we voor <span className="text-brand">staan.</span>
          </h2>
        </div>
        {[
          ["Eerlijk voordeel", "Aantrekkelijke deals en cashback, altijd transparant en betrouwbaar.", "M21.4 11.6 12.4 2.6A2 2 0 0 0 11 2H4a1 1 0 0 0-1 1v7c0 .5.2 1 .6 1.4l9 9a2 2 0 0 0 2.8 0l6-6a2 2 0 0 0 0-2.8Z"],
          ["Vrijheid voor webshops", "Webshops bepalen zelf hun aanbiedingen en voorwaarden.", "M4 10V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2M4 10h16M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9M9 20v-5h6v5"],
          ["Eenvoud voor iedereen", "Een gebruiksvriendelijk platform dat voor iedereen toegankelijk is.", "M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15.5 4.13a3.5 3.5 0 0 1 0 6.74"],
        ].map(([t, d, path]) => (
          <div key={t as string} className="rounded-3xl bg-white p-7 shadow-sm">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-light text-brand">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d={path as string} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
            <h3 className="mt-4 text-lg font-black text-navy">{t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>

      {/* Team */}
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="relative overflow-hidden rounded-[2rem] shadow-xl">
          <img src={images.officeImg2} alt="Team achter ShopBonus" className="h-80 w-full object-cover" />
          <div className="absolute inset-0 grid place-items-center bg-navy/20 p-8">
            <div className="grid h-48 w-64 place-items-center rounded-2xl bg-white/90 text-center backdrop-blur">
              <div>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="mx-auto text-muted"><path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM21 19v-1a4 4 0 0 0-3-3.87M15.5 4.13a3.5 3.5 0 0 1 0 6.74" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                <p className="mt-2 text-sm font-semibold text-muted">Foto oprichter<br />toevoegen</p>
              </div>
            </div>
          </div>
        </div>
        <div>
          <Eyebrow>De mensen achter ShopBonus</Eyebrow>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-navy">
            Het verhaal achter <span className="text-brand">ShopBonus.</span>
          </h2>
          <p className="mt-4 leading-relaxed text-muted">
            Achter ShopBonus staat een enthousiast team dat elke dag werkt aan een
            slimmer, voordeliger en eerlijker online shoplandschap. Vanuit onze gedeelde
            passie voor e-commerce en technologie bouwen we samen aan de toekomst.
          </p>
          <div className="mt-5 flex gap-3 rounded-2xl bg-blue-50 p-5">
            <span className="text-4xl font-black leading-none text-brand">“</span>
            <p className="font-semibold italic text-navy">
              We geloven in een online wereld waarin consumenten en webshops samen meer bereiken.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-6 rounded-[2rem] bg-gradient-to-br from-[#0b63ee] to-[#0b3fa0] p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-200">
              Samen naar een slimmere toekomst
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
              Samen maken we shoppen <span className="text-sky-300">slimmer.</span>
            </h2>
          </div>
          <div>
            <p className="text-blue-100/90">
              Of je nu op zoek bent naar de beste aanbiedingen of als webshop wilt groeien:
              we doen het samen. Ontdek wat ShopBonus voor jou kan betekenen.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/webshops" className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 font-extrabold text-brand">
                Ontdek aanbiedingen
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
              <Link href="/voor-webshops" className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/40 px-7 py-3.5 font-extrabold text-white hover:bg-white/10">
                Voor webshops
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
