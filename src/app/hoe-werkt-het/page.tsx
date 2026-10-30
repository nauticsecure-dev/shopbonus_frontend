import Link from "next/link";
import { Eyebrow } from "@/components/Cards";

const steps = [
  {
    n: "1",
    title: "Ontdek deelnemende webshops",
    desc: "Blader door goedgekeurde webshops en bekijk actuele, gepubliceerde aanbiedingen. Alleen openbare, actieve partners verschijnen in het overzicht.",
    icon: "M21 21l-4.3-4.3M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z",
  },
  {
    n: "2",
    title: "Maak een account of activeer een uitnodiging",
    desc: "Registreer direct of open een persoonlijke ShopBonus-uitnodiging na een geschikte aankoop. Een link openen kent geen punten of vouchers toe.",
    icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0",
  },
  {
    n: "3",
    title: "Verdien geverifieerde punten",
    desc: "Punten komen uit goedgekeurde activiteiten via de centrale wallet. Pending of onbevestigde affiliate-activiteit is nooit besteedbaar.",
    icon: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7ZM3 10h18M16.5 14.5h.01",
  },
  {
    n: "4",
    title: "Wissel in voor webshopvouchers",
    desc: "Gebruik beschikbaar tegoed voor door de webshop gefinancierde kortingsvouchers. Geen cashopnames of automatisch verstrekte codes op ongeverifieerde orders.",
    icon: "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z",
  },
];

const benefits = [
  {
    title: "Voor consumenten",
    items: [
      "Ontdek echte deelnemende webshops en gepubliceerde aanbiedingen",
      "Eén centrale wallet voor geverifieerde punten en vouchers",
      "Duidelijke voorwaarden, beschikbaarheid en puntenvereisten per aanbieding",
    ],
  },
  {
    title: "Voor webshops",
    items: [
      "Bereik shoppers die actief op zoek zijn naar voordeel",
      "Financier kortingsvouchers vanuit je eigen aanbod",
      "Publiceer alleen goedgekeurde publieke informatie",
    ],
  },
];

const faqs = [
  [
    "Wat kost ShopBonus voor consumenten?",
    "Een account is gratis. Je tegoed is alleen inwisselbaar voor vouchers bij deelnemende webshops — geen cashuitbetaling.",
  ],
  [
    "Wanneer zijn punten besteedbaar?",
    "Alleen geverifieerd, beschikbaar tegoed in je ShopBonus-wallet. Pending of onbevestigde activiteit telt niet mee.",
  ],
  [
    "Krijg ik automatisch een voucher na een bestelling?",
    "Nee. Ongecontroleerde of ongeverifieerde orders leveren geen automatisch toegekende vouchers of cash-equivalenten op.",
  ],
  [
    "Hoe activeer ik een persoonlijke uitnodiging?",
    "Open de beveiligde link, log in of maak een account, verifieer je e-mail en rond activatie één keer af. Verlopen of hergebruikte tokens werken niet.",
  ],
  [
    "Hoe meld ik mijn webshop aan?",
    "Ga naar ‘Voor webshops’ om te starten met onboarding. Alleen goedgekeurde en gepubliceerde webshops verschijnen in discovery.",
  ],
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
            Ontdek, spaar en <span className="text-brand">bespaar</span>
          </h1>
          <p className="mt-4 text-lg text-muted">
            ShopBonus helpt je deelnemende webshops te vinden, geverifieerde punten te sparen en die in te wisselen
            voor webshop-gefinancierde kortingsvouchers.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="lift relative rounded-3xl bg-white p-7 shadow-sm">
              <span className="absolute right-6 top-5 text-5xl font-black text-blue-50">{s.n}</span>
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand text-white">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                  <path d={s.icon} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h3 className="mt-4 text-lg font-black text-navy">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-[1.75rem] bg-white p-8 shadow-sm">
              <h2 className="text-2xl font-black text-navy">{b.title}</h2>
              <ul className="mt-4 space-y-3">
                {b.items.map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-black text-brand">
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-[1.75rem] bg-navy px-8 py-10 text-white sm:flex-row">
          <div>
            <h2 className="text-2xl font-black">Klaar om te starten?</h2>
            <p className="mt-2 max-w-xl text-sm text-blue-100/80">
              Maak een consumentenaccount of meld je webshop aan. Alle publieke content komt uit goedgekeurde ShopBonus-bronnen.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/account"
              className="inline-flex rounded-2xl bg-brand px-6 py-3.5 text-sm font-extrabold text-white hover:bg-brand-dark"
            >
              Account aanmaken
            </Link>
            <Link
              href="/voor-webshops"
              className="inline-flex rounded-2xl border border-white/30 px-6 py-3.5 text-sm font-extrabold text-white hover:bg-white/10"
            >
              Voor webshops
            </Link>
          </div>
        </div>

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
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/faq" className="text-sm font-bold text-brand hover:underline">
              Meer vragen in de FAQ →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
