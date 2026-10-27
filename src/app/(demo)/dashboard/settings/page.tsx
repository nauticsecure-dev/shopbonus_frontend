"use client";

import { useState } from "react";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import DashboardIcon from "@/features/dashboard/components/DashboardIcon";
import { DashboardHeading, Panel } from "@/features/dashboard/components/DashboardPrimitives";
import { merchantShop } from "@/fixtures/dashboard";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export default function DashboardSettingsPage() {
  const { pushToast } = useShopBonus();
  const [form, setForm] = useState({ name: merchantShop.name, email: merchantShop.email, website: "https://woonenco.nl", phone: "+31 20 123 4567" });
  const [preferences, setPreferences] = useState({ claims: true, lowStock: true, weeklyReport: false, productNews: false });
  const [saving, setSaving] = useState(false);

  const save = () => {
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      pushToast({ title: "Instellingen opgeslagen", message: "Je wijzigingen zijn bijgewerkt.", kind: "success" });
    }, 500);
  };

  return (
    <DashboardShell>
      <DashboardHeading title="Webshop" accent="instellingen" subtitle="Beheer je bedrijfsgegevens, meldingen en toegang." />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <Panel>
          <h2 className="text-xl font-black text-navy">Bedrijfsgegevens</h2>
          <p className="mt-1 text-sm text-muted">Houd je contactgegevens actueel.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {([["name", "Webshopnaam"], ["email", "Contact e-mailadres"], ["website", "Website"], ["phone", "Telefoonnummer"]] as const).map(([key, label]) => <label key={key} className="block"><span className="mb-1.5 block text-sm font-bold text-navy">{label}</span><input value={form[key]} onChange={(e) => setForm((current) => ({ ...current, [key]: e.target.value }))} className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/10" /></label>)}
          </div>
          <div className="mt-5 flex flex-col justify-between gap-3 rounded-2xl bg-blue-50/60 p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-brand"><DashboardIcon name="store" size={20} /></span><div><p className="font-extrabold text-navy">Webshopstatus</p><p className="text-xs text-muted">Je profiel is zichtbaar voor klanten.</p></div></div><span className="rounded-full bg-green-100 px-3 py-1.5 text-xs font-extrabold text-green-700">Goedgekeurd</span>
          </div>
          <button onClick={save} disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-70 sm:w-auto"><DashboardIcon name="check" size={18} />{saving ? "Opslaan…" : "Wijzigingen opslaan"}</button>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-xl font-black text-navy">E-mailmeldingen</h2>
            <p className="mt-1 text-sm text-muted">Kies welke updates je wilt ontvangen.</p>
            <div className="mt-4 space-y-4">
              {([["claims", "Nieuwe voucherclaims", "Direct als een klant een voucher claimt."], ["lowStock", "Lage codevoorraad", "Als een aanbieding bijna geen codes meer heeft."], ["weeklyReport", "Wekelijks prestatierapport", "Een overzicht van je resultaten per e-mail."], ["productNews", "Productnieuws", "Tips, nieuwe functies en ShopBonus-updates."]] as const).map(([key, title, detail]) => <button key={key} onClick={() => setPreferences((current) => ({ ...current, [key]: !current[key] }))} className="flex w-full items-start gap-3 text-left"><span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${preferences[key] ? "bg-brand text-white" : "border-2 border-slate-200 bg-white text-transparent"}`}><DashboardIcon name="check" size={15} strokeWidth={3} /></span><span className="flex-1"><span className="block text-sm font-extrabold text-navy">{title}</span><span className="block text-xs leading-relaxed text-muted">{detail}</span></span></button>)}
            </div>
          </Panel>
          <Panel className="border-amber-100 bg-amber-50/50">
            <div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-amber-600"><DashboardIcon name="alert" size={20} /></span><div><h3 className="font-black text-navy">Accountbeveiliging</h3><p className="mt-1 text-sm text-muted">Je account is beveiligd met e-mailverificatie.</p><button onClick={() => pushToast({ title: "Beveiligingsinstellingen", message: "Tweestapsverificatie is beschikbaar in een latere versie.", kind: "info" })} className="mt-3 text-sm font-extrabold text-brand hover:underline">Beveiliging beheren →</button></div></div>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  );
}
