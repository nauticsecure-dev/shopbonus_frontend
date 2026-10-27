"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import DashboardIcon, { type DashboardIconName } from "@/features/dashboard/components/DashboardIcon";
import { DashboardHeading, DashboardLineChart, DashboardStatCard, Panel, PanelHeading } from "@/features/dashboard/components/DashboardPrimitives";
import { adminActionItems, adminActivity, adminStats, adminTrend } from "@/fixtures/dashboard";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

const rangeLabels: Record<string, string[]> = {
  "7 dagen": ["8 apr", "9 apr", "10 apr", "11 apr", "12 apr", "13 apr", "14 apr"],
  "30 dagen": ["15 mrt", "18 mrt", "21 mrt", "24 mrt", "27 mrt", "30 mrt", "2 apr", "5 apr", "8 apr", "11 apr", "14 apr"],
  "90 dagen": ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"],
};

function seriesFor(range: string) {
  if (range === "7 dagen") return [240, 255, 280, 267, 309, 322, 355];
  if (range === "90 dagen") return [112, 135, 150, 146, 180, 205, 215, 240, 228, 280, 305, 360];
  return adminTrend;
}

function AdminDashboardPage() {
  const params = useSearchParams();
  const { pushToast } = useShopBonus();
  const [range, setRange] = useState("30 dagen");
  const [query, setQuery] = useState(params.get("q") || "");
  const [activeChart, setActiveChart] = useState("Uitgegeven vouchers");
  const values = seriesFor(range);
  const activity = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return adminActivity.filter((item) => !needle || `${item.type} ${item.description} ${item.detail}`.toLowerCase().includes(needle));
  }, [query]);


  const typeIcon = (type: string): DashboardIconName => {
    if (type === "Webshop") return "store";
    if (type === "Voucher") return "ticket";
    if (type === "Affiliate") return "coins";
    return "chat";
  };

  return (
    <DashboardShell admin>
      <DashboardHeading title="Super Admin" accent="Cockpit" subtitle="Live overzicht van ShopBonus. Beheer platformprestaties en acties." />

      {/* Main KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {adminStats.map((stat) => <DashboardStatCard key={stat.label} label={stat.label} value={stat.value} change={stat.change} icon={stat.icon as DashboardIconName} tone={stat.tone === "amber" ? "amber" : "blue"} />)}
      </div>

      {/* Charts */}
      <div className="mt-5 grid items-stretch gap-5 xl:grid-cols-12">
        <Panel className="xl:col-span-7">
          <PanelHeading
            title={activeChart}
            description="Dagelijks overzicht van prestaties over het geselecteerde tijdvak."
            action={<label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy"><DashboardIcon name="calendar" size={16} className="text-brand" /><select value={range} onChange={(e) => setRange(e.target.value)} className="bg-transparent outline-none"><option>7 dagen</option><option>30 dagen</option><option>90 dagen</option></select></label>}
          />
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted"><span className="h-2.5 w-2.5 rounded-full bg-brand" />Totaal in periode</div>
            <div className="flex rounded-xl bg-blue-50 p-1">
              {["Uitgegeven vouchers", "Commissie", "Wallettegoed"].map((item) => <button key={item} onClick={() => setActiveChart(item)} className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition sm:px-3 sm:text-xs ${activeChart === item ? "bg-brand text-white shadow" : "text-muted hover:text-navy"}`}>{item}</button>)}
            </div>
          </div>
          <DashboardLineChart
            values={activeChart === "Uitgegeven vouchers" ? values : activeChart === "Commissie" ? values.map((v) => Math.round(v * 3.2)) : values.map((v) => Math.round(v * 2.1))}
            id={`admin-${activeChart.replaceAll(" ", "-")}`}
            labels={rangeLabels[range]}
            height={300}
            ySuffix={activeChart === "Uitgegeven vouchers" ? "" : ""}
          />
          <p className="mt-2 border-t border-blue-50 pt-3 text-xs text-muted">Voorbeeldgegevens, bijgewerkt voor de laatste {range.toLowerCase()}.</p>
        </Panel>

        <Panel id="affiliate" className="xl:col-span-5">
          <PanelHeading title="Verdeling affiliatekanalen" description="Uitgegeven vouchers per affiliate netwerk." action={<label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy"><DashboardIcon name="calendar" size={16} className="text-brand" /><select value={range} onChange={(e) => setRange(e.target.value)} className="bg-transparent outline-none"><option>7 dagen</option><option>30 dagen</option><option>90 dagen</option></select></label>} />
          <div className="flex flex-col items-center gap-6 py-4 sm:flex-row sm:justify-center sm:gap-8">
            <div className="relative grid h-48 w-48 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#0b74ff 0% 68%, #8cc4ff 68% 100%)" }}>
              <div className="grid h-[118px] w-[118px] place-items-center rounded-full bg-white text-center shadow-inner"><div><p className="text-2xl font-black text-navy">2.364</p><p className="text-xs font-semibold text-muted">vouchers</p></div></div>
              <span className="absolute right-5 top-12 text-xs font-black text-white">68%</span>
              <span className="absolute bottom-10 left-4 text-xs font-black text-white">32%</span>
            </div>
            <div className="w-full max-w-xs space-y-4">
              {[["Daisycon", "1.608", "68%", "bg-brand"], ["TradeTracker", "756", "32%", "bg-[#8cc4ff]"]].map(([name, count, percent, color]) => <div key={name} className="flex items-center gap-3 border-b border-blue-50 pb-3 last:border-0"><span className={`h-3.5 w-3.5 shrink-0 rounded-full ${color}`} /><span className="flex-1 font-semibold text-navy">{name}</span><strong className="text-navy">{count}</strong><span className="w-10 text-right text-sm text-muted">{percent}</span></div>)}
            </div>
          </div>
          <div className="rounded-xl bg-blue-50/70 px-4 py-3 text-xs text-muted">Affiliate-integraties zijn actief. Laatste synchronisatie: <strong className="text-navy">vandaag, 09:12</strong></div>
        </Panel>
      </div>

      {/* Activity and action required */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-12">
        <Panel id="webshops" className="p-0 xl:col-span-7">
          <div className="flex flex-col gap-3 border-b border-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div><h2 className="text-lg font-black text-navy sm:text-xl">Recente activiteit</h2><p className="text-sm text-muted">De laatste belangrijke gebeurtenissen in ShopBonus.</p></div>
            <button onClick={() => pushToast({ title: "Activiteitsoverzicht", message: "Alle activiteiten staan in dit demo-overzicht.", kind: "info" })} className="inline-flex items-center gap-1.5 self-start rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-blue-100 sm:self-auto">Alles bekijken <DashboardIcon name="arrow" size={14} /></button>
          </div>

          {/* Desktop activity table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead><tr className="bg-blue-50/70 text-xs font-extrabold text-muted"><th className="px-5 py-3">Tijd</th><th className="px-3 py-3">Type</th><th className="px-3 py-3">Omschrijving</th><th className="px-3 py-3">Details</th><th className="px-4 py-3" /></tr></thead>
              <tbody>{activity.map((item) => <tr key={`${item.time}-${item.description}`} className="border-b border-blue-50 last:border-0"><td className="whitespace-nowrap px-5 py-3 text-xs text-muted">{item.time}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand"><DashboardIcon name={typeIcon(item.type)} size={15} />{item.type}</span></td><td className="px-3 py-3 font-semibold text-navy">{item.description}</td><td className="px-3 py-3 text-muted">{item.detail}</td><td className="px-4 py-3 text-right"><button onClick={() => pushToast({ title: item.description, message: item.detail, kind: "info" })} className="rounded-lg px-2 text-lg font-black text-muted hover:bg-blue-50">···</button></td></tr>)}</tbody>
            </table>
            {activity.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Geen activiteit gevonden.</p>}
          </div>
          {/* Mobile activity list */}
          <div className="space-y-2 p-3 md:hidden">{activity.map((item) => <article key={`${item.time}-${item.description}`} className="flex items-start gap-3 rounded-xl bg-slate-50/70 p-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-brand"><DashboardIcon name={typeIcon(item.type)} size={17} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-bold text-brand">{item.type}</span><span className="text-[11px] text-muted">{item.time}</span></div><p className="text-sm font-extrabold text-navy">{item.description}</p><p className="text-xs text-muted">{item.detail}</p></div></article>)}{activity.length === 0 && <p className="py-8 text-center text-sm text-muted">Geen activiteit gevonden.</p>}</div>
        </Panel>

        <div id="support" className="space-y-5 xl:col-span-5">
          <Panel>
            <PanelHeading title="Actie vereist" description="Items die om aandacht vragen." action={<span className="rounded-full bg-red-50 px-3 py-1 text-xs font-extrabold text-red-600">9 open</span>} />
            <div className="space-y-2.5">
              {adminActionItems.map((item) => <button key={item.title} onClick={() => pushToast({ title: item.title, message: item.detail, kind: "info" })} className="flex w-full items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 text-left transition hover:border-brand/40 hover:bg-blue-50/30">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone === "red" ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}><DashboardIcon name={item.icon as DashboardIconName} size={21} /></span>
                <span className={`text-2xl font-black ${item.tone === "red" ? "text-red-500" : "text-amber-600"}`}>{item.count}</span>
                <span className="min-w-0 flex-1"><span className="block text-sm font-extrabold text-navy">{item.title}</span><span className="block text-xs leading-snug text-muted">{item.detail}</span></span>
                <DashboardIcon name="chevron" size={17} className="shrink-0 text-brand" />
              </button>)}
            </div>
          </Panel>
          <Panel id="settings" className="bg-gradient-to-br from-blue-50 to-white">
            <div className="flex gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand shadow-sm"><DashboardIcon name="settings" size={21} /></span><div><h3 className="font-black text-navy">Platformstatus</h3><p className="mt-1 text-sm text-muted">Alle systemen werken normaal.</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold"><div className="rounded-xl bg-white p-3 text-muted">API status <span className="float-right text-green-600">● Online</span></div><div className="rounded-xl bg-white p-3 text-muted">Affiliate sync <span className="float-right text-green-600">● Online</span></div></div>
            <button onClick={() => pushToast({ title: "Platforminstellingen", message: "Instellingen zijn alleen-lezen in deze demo.", kind: "info" })} className="mt-4 text-sm font-extrabold text-brand hover:underline">Platforminstellingen openen →</button>
          </Panel>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-2xl border border-blue-100 bg-white/70 px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <span>ShopBonus admin cockpit · Dummy-data voor demonstratie</span>
        <span>Laatste update: 14 apr 2025 · 10:24</span>
      </div>
    </DashboardShell>
  );
}

export default function AdminPage() { return <Suspense fallback={<p className="p-8">Cockpit laden…</p>}><AdminDashboardPage /></Suspense>; }
