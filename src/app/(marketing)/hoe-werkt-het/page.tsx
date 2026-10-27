import Link from "next/link";
import { Eyebrow } from "@/components/Cards";
import { images } from "@/fixtures/dummy";

const steps = [
  {
    n: "1",
    title: "Maak een gratis account",
    desc: "Meld je aan in 2 minuten. Je ontvangt direct €5 welkomsttegoed in je wallet.",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  },
  {
    n: "2",
    title: "Shop via ShopBonus",
    desc: "Klik door naar je favoriete webshop en shop zoals je gewend bent. Wij registreren je aankoop automatisch.",
    icon: "M6 8h12l1 12.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1L6 8ZM9 10V6.5a3 3 0 0 1 6 0V10",
  },
  {
    n: "3",
    title: "Ontvang tegoed",
    desc: "Wij ontvangen een commissie van de webshop en zetten 70% daarvan als ShopBonus-tegoed in je wallet.",
    icon: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 10h18M16.5 14.5h.01",
  },
  {
    n: "4",
    title: "Ontgrendel vouchers",
    desc: "Gebruik je tegoed voor exclusieve kortingsvouchers: tot 20% korting of €25 voordeel per voucher.",
    icon: "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z",
  },
];

const faqs = [
  ["Wat kost ShopBonus?", "Niets. Een account is gratis en je tegoed verloopt nooit zomaar. Wij verdienen alleen een kleine commissie per verkoop."],
  ["Hoe snel staat mijn tegoed in de wallet?", "Meestal binnen 24 uur na je aankoop. Bij sommige webshops duurt het tot 14 dagen in verband met retourtermijnen."],
  ["Waar kan ik mijn tegoed aan besteden?", "Je tegoed is te gebruiken voor kortingsvouchers bij alle aangesloten webshops. Zo haal je nóg meer uit elke euro."],
  ["Kan ik vouchers cadeau doen?", "Ja! Elke voucher heeft een unieke code die je kunt delen met vrienden en familie."],
  ["Hoe meld ik mijn webshop aan?", "Via ‘Voor webshops’ meld je je in 3 stappen aan: gegevens, eerste aanbieding en activeren. Binnen een dag ben je live."],
];

export default function HoeWerktHetPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[300px] h-[28rem] w-[28rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Eyebrow>Hoe werkt het?</Eyebrow>
          <h1 className="mt-3 text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-tight tracking-tight text-navy">
            Voordeel in <span className="text-brand">4 stappen</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            Van eerste aankoop tot exclusieve voucher: zo simpel is ShopBonus.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="lift relative rounded-3xl bg-white p-7 shadow-sm">
              <span className="absolute right-6 top-5 text-5xl font-black text-blue-50">{s.n}</span>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><path d={s.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <h3 className="mt-4 text-lg font-black text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Example calculation */}
        <div className="mt-10 grid items-center gap-8 rounded-[2rem] bg-navy p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-sky-300">Rekenvoorbeeld</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Zo groeit je <span className="text-sky-300">tegoed</span>
            </h2>
            <div className="mt-6 space-y-3">
              {[
                ["Bol.com aankoop van €170", "+ €8,50"],
                ["Booking.com boeking van €212", "+ €4,25"],
                ["Techwinkel aankoop van €213", "+ €6,40"],
              ].map(([l, a]) => (
                <div key={l} className="flex items-center justify-between rounded-2xl bg-white/10 px-5 py-4">
                  <span className="font-semibold text-blue-100">{l}</span>
                  <span className="text-xl font-black text-green-300">{a}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-brand px-5 py-4">
                <span className="font-extrabold">Totaal tegoed</span>
                <span className="text-2xl font-black">€19,15</span>
              </div>
            </div>
            <p className="mt-3 text-xs text-blue-100/60">Fictief voorbeeld met dummy-data. Percentages verschillen per webshop.</p>
          </div>
          <div className="overflow-hidden rounded-3xl">
            <img src={images.shopperImg} alt="Tevreden shopper" className="h-[380px] w-full object-cover" />
          </div>
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-14 max-w-3xl">
          <div className="text-center">
            <Eyebrow>Veelgestelde vragen</Eyebrow>
            <h2 className="mt-2 text-3xl font-black text-navy">Goed om te weten</h2>
          </div>
          <div className="mt-6 space-y-3">
            {faqs.map(([q, a]) => (
              <details key={q} className="group rounded-2xl bg-white p-6 shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-extrabold text-navy">
                  {q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-light text-brand transition group-open:rotate-45">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/account" className="inline-flex items-center gap-2 rounded-2xl bg-brand px-9 py-4 font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] hover:bg-brand-dark">
              Maak gratis een account
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
