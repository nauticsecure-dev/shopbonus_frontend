"use client";

import { useMemo, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, DashboardLineChart, DashboardStatCard, Panel, PanelHeading } from "@/components/DashboardPrimitives";
import { useShopBonus } from "@/store/ShopBonusContext";

type Range = "7 dagen" | "30 dagen" | "90 dagen";
type Metric = "Omzet" | "Bestellingen" | "Conversie";

const series: Record<Range, Record<Metric, number[]>> = {
  "7 dagen": {
    Omzet: [110, 158, 188, 175, 265, 345, 420],
    Bestellingen: [4, 7, 8, 7, 12, 16, 18],
    Conversie: [2.4, 2.9, 2.7, 3.3, 3.8, 3.5, 4.2],
  },
  "30 dagen": {
    Omzet: [125, 160, 195, 185, 245, 265, 220, 285, 390, 175, 265, 310, 220, 185, 210, 280, 325, 360, 420, 340, 380, 460, 420, 505],
    Bestellingen: [6, 7, 8, 8, 10, 11, 9, 12, 16, 8, 12, 13, 10, 9, 10, 12, 14, 15, 17, 14, 15, 18, 16, 20],
    Conversie: [2.1, 2.2, 2.5, 2.4, 2.8, 3.1, 2.7, 3.2, 3.7, 2.8, 3, 3.2, 2.9, 2.7, 2.8, 3.1, 3.3, 3.5, 3.8, 3.2, 3.5, 4, 3.7, 4.2],
  },
  "90 dagen": {
    Omzet: [95, 130, 155, 220, 190, 245, 350, 175, 260, 305, 220, 185, 210, 280, 325, 360, 420, 340, 380, 460],
    Bestellingen: [4, 5, 6, 8, 7, 9, 13, 7, 10, 12, 9, 8, 9, 11, 13, 14, 16, 14, 15, 19],
    Conversie: [1.9, 2, 2.3, 2.5, 2.4, 2.8, 3, 2.6, 2.9, 3.2, 2.7, 2.8, 3, 3.1, 3.4, 3.5, 3.6, 3.3, 3.7, 4.1],
  },
};

const labelsByRange: Record<Range, string[]> = {
  "7 dagen": ["ma", "di", "wo", "do", "vr", "za", "zo"],
  "30 dagen": ["2 jun", "6 jun", "10 jun", "14 jun", "18 jun", "22 jun", "26 jun", "30 jun"],
  "90 dagen": ["apr 1", "apr 15", "mei 1", "mei 15", "jun 1", "jun 15", "jun 30"],
};

export default function MerchantAnalyticsPage() {
  const { pushToast } = useShopBonus();
  const [range, setRange] = useState<Range>("30 dagen");
  const [metric, setMetric] = useState<Metric>("Omzet");
  const values = series[range][metric];
  const totalRevenue = useMemo(() => values.reduce((sum, value) => sum + value, 0), [values]);
  const currentValue = values[values.length - 1] ?? 0;
  const ySuffix = metric === "Omzet" ? "" : metric === "Conversie" ? "%" : "";
  const stats = [
    { label: "Bannervertoningen", value: "12.500", change: "+18%", icon: "eye" as const },
    { label: "Klikken", value: "480", change: "+12%", icon: "cursor" as const },
    { label: "Bestellingen", value: "39", change: "+34%", icon: "cart" as const },
    { label: "Omzet", value: "€ 4.350", change: "+28%", icon: "coins" as const },
  ];

  const metricValue = () => {
    if (metric === "Omzet") return `€ ${currentValue.toLocaleString("nl-NL")}`;
    if (metric === "Conversie") return `${currentValue.toFixed(1)}%`;
    return currentValue.toLocaleString("nl-NL");
  };

  return (
    <DashboardShell>
      <DashboardHeading
        title="Zo presteren jouw"
        accent="aanbiedingen."
        subtitle="Ontdek hoeveel bezoekers, bestellingen en omzet ShopBonus oplevert."
        action={
          <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-navy shadow-sm">
            <DashboardIcon name="calendar" size={18} className="text-brand" />
            <select value={range} onChange={(e) => setRange(e.target.value as Range)} className="bg-transparent outline-none">
              <option>7 dagen</option><option>30 dagen</option><option>90 dagen</option>
            </select>
          </label>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} {...stat} />)}
      </div>

      <Panel className="mt-5">
        <PanelHeading
          title="Omzetontwikkeling"
          description="De omzet die jouw aanbiedingen via ShopBonus genereren."
          action={
            <div className="flex w-full rounded-xl bg-blue-50 p-1 sm:w-auto">
              {(["Omzet", "Bestellingen", "Conversie"] as Metric[]).map((item) => (
                <button key={item} onClick={() => setMetric(item)} className={`flex-1 rounded-lg px-3 py-2 text-xs font-extrabold transition sm:flex-none sm:px-4 sm:text-sm ${metric === item ? "bg-brand text-white shadow" : "text-muted hover:text-navy"}`}>
                  {item}
                </button>
              ))}
            </div>
          }
        />
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted"><span className="h-2.5 w-2.5 rounded-full bg-brand" />{metric} · {range}</div>
          <p className="text-sm font-extrabold text-navy">Huidige waarde: {metricValue()}</p>
        </div>
        <DashboardLineChart values={values} id="merchant-analytics" labels={labelsByRange[range]} height={310} ySuffix={ySuffix} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-blue-50 pt-3 text-xs text-muted">
          <span>Trend opgebouwd uit dummy-data voor {range.toLowerCase()}.</span>
          <span>Totaal in periode: <strong className="text-navy">{metric === "Omzet" ? `€ ${totalRevenue.toLocaleString("nl-NL")}` : totalRevenue.toLocaleString("nl-NL")}</strong></span>
        </div>
      </Panel>

      <div className="mt-5 grid gap-5 xl:grid-cols-5">
        <Panel className="xl:col-span-3">
          <PanelHeading
            title="Voucherprestaties"
            description="Van uitgegeven vouchers tot verzilverde vouchers."
            action={<button onClick={() => pushToast({ title: "Voucherprestaties", message: "De details zijn bijgewerkt met de geselecteerde periode.", kind: "info" })} className="inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:underline">Bekijk details <DashboardIcon name="arrow" size={16} /></button>}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { value: "52", label: "Uitgegeven", icon: "ticket" as const, tint: "text-brand" },
              { value: "37", label: "Geclaimd", icon: "users" as const, tint: "text-brand" },
              { value: "16", label: "Verzilverd", icon: "check" as const, tint: "text-green-600" },
            ].map((item) => <div key={item.label} className="flex items-center gap-3 rounded-2xl bg-slate-50/70 p-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-50"><DashboardIcon name={item.icon} size={23} className={item.tint} /></span>
              <div><p className="text-2xl font-black text-navy">{item.value}</p><p className="text-sm text-muted">{item.label}</p></div>
            </div>)}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[["Uitgegeven", 52, "bg-blue-500"], ["Geclaimd", 37, "bg-sky-300"], ["Verzilverd", 16, "bg-green-400"]].map(([label, value, color]) => <div key={label as string}>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, (Number(value) / 52) * 100)}%` }} /></div>
              <p className="mt-2 text-xs text-muted">{label} <strong className="text-navy">{value}</strong></p>
            </div>)}
          </div>
        </Panel>

        <Panel className="flex flex-col justify-between bg-gradient-to-br from-amber-50/70 to-white xl:col-span-2">
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-100 text-amber-600"><DashboardIcon name="alert" size={25} /></span>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">Slim inzicht</p>
            <h2 className="mt-2 text-xl font-black text-navy">Meer herhaalaankopen met een winkelwagenbanner</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">Klanten die je aanbieding zien in hun winkelwagen claimen gemiddeld vaker een voucher. Een herinnering op het juiste moment kan conversie verhogen.</p>
          </div>
          <button onClick={() => pushToast({ title: "Voorstel aangevraagd", message: "We sturen je een voorstel naar je account e-mail (demo).", kind: "success" })} className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl border border-blue-200 bg-white px-5 py-3 text-sm font-extrabold text-brand hover:bg-blue-50">Bekijk voorstel <DashboardIcon name="arrow" size={16} /></button>
        </Panel>
      </div>

      <div className="mt-5 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
        <span className="font-extrabold text-navy">Let op:</span> deze rapportage gebruikt voorbeelddata. Werkelijke conversies en uitbetalingen kunnen afwijken.
      </div>
    </DashboardShell>
  );
}
