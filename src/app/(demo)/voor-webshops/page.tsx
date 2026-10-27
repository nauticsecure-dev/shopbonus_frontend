"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/Cards";
import { images } from "@/fixtures/dummy";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

type DiscountType = "percentage" | "fixed";

export default function VoorWebshopsPage() {
  const { pushToast } = useShopBonus();
  const [step, setStep] = useState(1);

  // Step 1 data
  const [shop, setShop] = useState({
    name: "Woon & Co",
    website: "https://woonenco.nl",
    categories: ["Wonen", "Interieur", "Lifestyle"],
    description:
      "Alles voor een stijlvol thuis. Van meubels en decoratie tot verlichting en woonaccessoires.",
  });

  // Step 2 data
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discount, setDiscount] = useState("10");
  const [minOrder, setMinOrder] = useState("100");
  const [maxDiscount, setMaxDiscount] = useState("10");
  const [validity, setValidity] = useState("90");
  const [terms, setTerms] = useState("Niet combineerbaar met andere acties.");
  const [codes, setCodes] = useState("");
  const codesFound = useMemo(() => {
    const pasted = codes.split("\n").map((c) => c.trim()).filter(Boolean);
    return new Set(pasted).size;
  }, [codes]);

  const [activated, setActivated] = useState(false);

  const discountNum = Math.max(0, Number(discount) || 0);

  const previewTitle = discountType === "percentage" ? `${discountNum}% korting` : `€${discountNum} korting`;
  const previewSub =
    discountType === "percentage"
      ? `Vanaf €${minOrder || 0} · Maximaal €${maxDiscount || 0}`
      : `Vanaf €${minOrder || 0}`;

  const initials = shop.name
    .split(/[\s&]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3);

  const next = () => {
    if (step === 1 && (!shop.name.trim() || !shop.website.trim())) {
      pushToast({ title: "Vul je gegevens aan", message: "Naam en website zijn verplicht.", kind: "error" });
      return;
    }
    if (step === 2 && (discountNum <= 0 || (discountType === "percentage" && discountNum > 100) || codesFound === 0)) {
      pushToast({ title: "Korting ontbreekt", message: "Vul een geldige korting in en voeg minimaal één unieke code toe.", kind: "error" });
      return;
    }
    setStep((s) => Math.min(3, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activate = () => {
    setActivated(true);
    pushToast({ title: "Gefeliciteerd! 🎉", message: "Je webshop is live op ShopBonus (demo).", kind: "success" });
  };

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[160px] h-[28rem] w-[28rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <Eyebrow>Stap {step} van 3</Eyebrow>
            <h1 className="mt-2 text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-none tracking-tight">
              <span className="text-navy">Je webshop</span>{" "}
              <span className="text-brand">aanmelden</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              {step === 1 && "Vertel ons over je webshop. Vul de gegevens in voor je demoaanbieding."}
              {step === 2 && "Stel je eerste aanbieding in en laat klanten profiteren van jouw webshop via ShopBonus."}
              {step === 3 && "Controleer alles en activeer je webshop op ShopBonus."}
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-start gap-0 pt-2">
            {[
              { n: 1, t: "Gegevens", d: step > 1 ? "Voltooid" : step === 1 ? "Huidige stap" : "Nog te doen" },
              { n: 2, t: "Voucher instellen", d: step > 2 ? "Voltooid" : step === 2 ? "Huidige stap" : "Nog te doen" },
              { n: 3, t: "Activeren", d: step > 3 ? "Voltooid" : step === 3 ? "Huidige stap" : "Nog te doen" },
            ].map((s, i) => {
              const done = step > s.n;
              const current = step === s.n;
              return (
                <div key={s.n} className="flex flex-1 items-start">
                  <div className="flex flex-col items-center text-center">
                    <button
                      disabled={activated || s.n > step}
                      aria-label={`Stap ${s.n}: ${s.t}`}
                      onClick={() => !activated && s.n < step && setStep(s.n)}
                      className={`grid h-14 w-14 place-items-center rounded-full text-xl font-black transition ${
                        done
                          ? "bg-green-600 text-white"
                          : current
                            ? "bg-brand text-white ring-4 ring-blue-200"
                            : "bg-blue-50 text-muted"
                      }`}
                    >
                      {done ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      ) : (
                        s.n
                      )}
                    </button>
                    <p className={`mt-2 font-extrabold ${done || current ? "text-navy" : "text-muted"}`}>
                      {s.n}. {s.t}
                    </p>
                    <p className={`text-sm ${current ? "font-bold text-brand" : "text-muted"}`}>{s.d}</p>
                  </div>
                  {i < 2 && <div className={`mx-2 mt-7 h-[3px] flex-1 rounded-full ${step > s.n ? "bg-brand" : "bg-blue-100"}`} />}
                </div>
              );
            })}
          </div>
        </div>

        {step === 1 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black text-navy">Webshopgegevens</h2>
              <p className="mt-1 text-muted">Controleer de voorbeeldgegevens en pas ze aan voor je webshop.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Naam webshop</label>
                  <input value={shop.name} onChange={(e) => setShop({ ...shop, name: e.target.value })} className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Website</label>
                  <input value={shop.website} onChange={(e) => setShop({ ...shop, website: e.target.value })} className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Beschrijving</label>
                  <textarea value={shop.description} onChange={(e) => setShop({ ...shop, description: e.target.value })} rows={3} className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none" />
                </div>
                <button onClick={next} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-extrabold text-white hover:bg-brand-dark">
                  Volgende: Voucher instellen
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-[1.75rem] bg-navy p-8 text-white sm:p-10">
              <h3 className="text-2xl font-black">Waarom ShopBonus?</h3>
              <ul className="mt-5 space-y-4">
                {[
                  ["Geen startkosten", "Je betaalt alleen een commissie per daadwerkelijke verkoop."],
                  ["Jij bepaalt", "Zelf aanbiedingen, voorwaarden en looptijd instellen."],
                  ["Meer omzet", "Bereik duizenden koopklare klanten die actief naar deals zoeken."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand font-black">✓</span>
                    <div><p className="font-extrabold">{t}</p><p className="text-sm text-blue-100/70">{d}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            {/* Form */}
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 rotate-[-8deg] place-items-center rounded-2xl bg-brand text-xl font-black text-white">%</span>
                <div>
                  <h2 className="text-2xl font-black text-navy">Je eerste aanbieding</h2>
                  <p className="text-muted">Maak een aantrekkelijke kortingsvoucher voor jouw webshop.</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Kortingssoort</label>
                  <div className="relative">
                    <select
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="w-full appearance-none rounded-2xl border border-blue-100 bg-white py-3.5 pl-12 pr-10 font-medium focus:border-brand focus:outline-none"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Vast bedrag</option>
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-brand">%</span>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-navy" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Korting</label>
                  <div className="relative">
                    <input type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} className="w-full rounded-2xl border border-blue-100 py-3.5 pl-5 pr-14 font-medium focus:border-brand focus:outline-none" />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">
                      {discountType === "percentage" ? "%" : "€"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Minimale bestelwaarde</label>
                  <div className="relative">
                    <input type="number" min={0} value={minOrder} onChange={(e) => setMinOrder(e.target.value)} className="w-full rounded-2xl border border-blue-100 py-3.5 pl-14 pr-4 font-medium focus:border-brand focus:outline-none" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">€</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Maximale korting</label>
                  <div className="relative">
                    <input type="number" min={0} value={maxDiscount} onChange={(e) => setMaxDiscount(e.target.value)} disabled={discountType === "fixed"} className="w-full rounded-2xl border border-blue-100 py-3.5 pl-14 pr-4 font-medium focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-muted" />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">€</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block font-bold text-navy">Geldigheid van de voucher</label>
                <div className="relative">
                  <select value={validity} onChange={(e) => setValidity(e.target.value)} className="w-full appearance-none rounded-2xl border border-blue-100 bg-white py-3.5 pl-12 pr-24 font-medium focus:border-brand focus:outline-none">
                    <option value="30">30</option>
                    <option value="60">60</option>
                    <option value="90">90</option>
                    <option value="180">180</option>
                  </select>
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" /><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </span>
                  <span className="absolute right-12 top-1/2 -translate-y-1/2 font-semibold text-navy">dagen</span>
                  <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-navy" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block font-bold text-navy">Aanvullende voorwaarden (tekst)</label>
                <div className="relative">
                  <textarea value={terms} maxLength={500} onChange={(e) => setTerms(e.target.value)} rows={3} className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none" />
                  <span className="absolute bottom-3 right-4 text-xs font-semibold text-muted">{terms.length}/500</span>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-brand">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" className="mx-auto"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 3v5h5M12 11v6M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-sm font-extrabold text-green-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="currentColor" /><path d="m8 12.5 2.7 2.7L16 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    {codesFound} codes gevonden
                  </span>
                </div>
                <p className="mt-2 font-extrabold text-navy">Plak je kortingscodes</p>
                <p className="text-sm text-muted">Eén code per regel. Dubbele codes worden één keer geteld.</p>
                <textarea
                  value={codes}
                  onChange={(e) => setCodes(e.target.value)}
                  placeholder="WOON10-AAAA&#10;WOON10-BBBB&#10;…"
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 font-mono text-sm focus:border-brand focus:outline-none"
                />
              </div>
            </div>

            {/* Live preview */}
            <div className="rounded-[1.75rem] bg-white/70 p-7 shadow-sm backdrop-blur sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-navy">Live preview van je voucher</h2>
                  <p className="mt-1 text-muted">Zo zien klanten jouw aanbieding op ShopBonus.</p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-mint px-4 py-2 text-sm font-extrabold text-green-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-600" /> Klaar om te activeren
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-md">
                <div className="relative">
                  <img src={images.livingRoom} alt="Preview" className="h-44 w-full object-cover" />
                  <span className="absolute right-4 top-4 rounded-2xl bg-green-100/95 px-4 py-2 text-lg font-black text-green-700 shadow">
                    {previewTitle}
                  </span>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#f6f1e8] text-lg font-black">
                    {initials || "W"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-navy">{shop.name || "Jouw webshop"}</p>
                    <p className="truncate text-sm text-muted">{shop.description.split(".")[0]}.</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {shop.categories.map((c) => (
                        <span key={c} className="rounded-full bg-mist px-3 py-0.5 text-xs font-bold text-navy">{c}</span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 rounded-2xl bg-brand-light/60 px-4 py-3 sm:flex">
                    <span className="grid h-10 w-10 rotate-[-8deg] place-items-center rounded-xl bg-brand text-base font-black text-white">%</span>
                    <div>
                      <p className="text-lg font-black leading-none text-brand">{previewTitle}</p>
                      <p className="mt-1 text-xs font-bold text-navy">{previewSub}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-navy">Webshopgegevens</h3>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
                    Bewerken
                  </button>
                </div>
                <p className="text-sm text-muted">Voorbeeldgegevens voor deze demo, nog te controleren.</p>
                <dl className="mt-3 space-y-2.5 rounded-2xl bg-white p-5 text-[15px] shadow-sm">
                  <div className="flex gap-3"><dt className="w-32 shrink-0 text-muted">Naam</dt><dd className="font-bold text-navy">{shop.name}</dd></div>
                  <div className="flex gap-3"><dt className="w-32 shrink-0 text-muted">Website</dt><dd className="font-bold text-brand">{shop.website}</dd></div>
                  <div className="flex gap-3"><dt className="w-32 shrink-0 text-muted">Categorieën</dt><dd className="flex flex-wrap gap-1.5">{shop.categories.map((c) => (<span key={c} className="rounded-full bg-mist px-3 py-0.5 text-sm font-bold text-navy">{c}</span>))}</dd></div>
                  <div className="flex gap-3"><dt className="w-32 shrink-0 text-muted">Beschrijving</dt><dd className="text-navy">{shop.description}</dd></div>
                </dl>
              </div>

              <button onClick={next} className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] hover:bg-brand-dark">
                Volgende: Activeren
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black text-navy">Controleer je aanmelding</h2>
              <div className="mt-5 space-y-3">
                {[
                  ["Webshop", shop.name],
                  ["Website", shop.website],
                  ["Aanbieding", `${previewTitle} — ${previewSub}`],
                  ["Geldigheid", `${validity} dagen`],
                  ["Voorwaarden", terms || "—"],
                  ["Codes", `${codesFound} codes klaar`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 rounded-2xl bg-mist/70 px-5 py-3.5">
                    <span className="font-bold text-muted">{k}</span>
                    <span className="text-right font-extrabold text-navy">{v}</span>
                  </div>
                ))}
              </div>
              <label className="mt-5 flex items-start gap-3 text-sm font-medium text-navy">
                <input type="checkbox" defaultChecked className="mt-1 h-5 w-5 accent-[#0b74ff]" />
                Dit is een demoactivatie. Er wordt geen partnerovereenkomst afgesloten.
              </label>
              {!activated ? (
                <button onClick={activate} className="mt-5 w-full rounded-2xl bg-green-600 py-4 font-extrabold text-white shadow-lg transition hover:bg-green-700">
                  Activeer mijn webshop →
                </button>
              ) : (
                <div className="mt-5 rounded-2xl bg-mint p-5 text-center">
                  <p className="text-3xl">🎉</p>
                  <p className="mt-2 font-black text-green-800">Je demoaanmelding is klaar!</p>
                  <p className="text-sm text-green-700">Ga verder naar je dashboard met voorbeeldgegevens.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Link href="/dashboard" className="flex-1 rounded-xl bg-green-700 py-3 text-sm font-extrabold text-white">Naar dashboard</Link>
                    <Link href="/webshops" className="flex-1 rounded-xl bg-white py-3 text-sm font-extrabold text-green-800">Bekijk webshops</Link>
                    <button onClick={() => { setActivated(false); setStep(1); }} className="flex-1 rounded-xl border border-green-200 bg-white py-3 text-sm font-extrabold text-green-800">Nieuwe aanmelding</button>
                  </div>
                </div>
              )}
            </div>
            <div className="overflow-hidden rounded-[1.75rem] bg-navy p-8 text-white sm:p-10">
              <h3 className="text-2xl font-black">Wat gebeurt er na activatie?</h3>
              <div className="mt-6 space-y-5">
                {[
                  ["Direct live", "Je webshop verschijnt in het overzicht en klanten kunnen je vouchers ontgrendelen."],
                  ["Melding bij verkoop", "Je ontvangt een e-mail zodra een klant een voucher van je gebruikt."],
                  ["Maandelijkse afrekening", "Commissies worden maandelijks verrekend. 70% gaat als tegoed naar de klant."],
                ].map(([t, d], i) => (
                  <div key={t} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand font-black">{i + 1}</span>
                    <div><p className="font-extrabold">{t}</p><p className="text-sm text-blue-100/70">{d}</p></div>
                  </div>
                ))}
              </div>
              <div className="mt-8 rounded-2xl bg-white/10 p-5">
                <p className="text-sm italic text-blue-100/90">“Binnen een week 40 nieuwe klanten via ShopBonus. Aanmelden was zo gepiept.”</p>
                <p className="mt-2 text-sm font-bold">— Marloes, eigenaresse Bloom & Zo</p>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
