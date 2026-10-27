"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import DashboardIcon from "@/features/dashboard/components/DashboardIcon";
import {
  DashboardHeading,
  DashboardLineChart,
  DashboardStatCard,
  Panel,
  PanelHeading,
  StatusPill,
} from "@/features/dashboard/components/DashboardPrimitives";
import {
  merchantClaimsByRange,
  merchantNotifications,
  merchantOffers as initialOffers,
  type MerchantOffer,
} from "@/fixtures/dashboard";

const formatCount = (n: number) => n.toLocaleString("nl-NL");

export default function MerchantDashboardPage() {
  const [offers] = useState<MerchantOffer[]>(initialOffers);
  const [range, setRange] = useState<keyof typeof merchantClaimsByRange>("30 dagen");
  const activeOffers = offers.filter((offer) => offer.status === "Actief").length;
  const codeCount = offers.reduce((sum, offer) => sum + offer.stock, 0);
  const issuedCount = offers.reduce((sum, offer) => sum + offer.issued, 0);
  const claimedCount = offers.reduce((sum, offer) => sum + offer.claimed, 0);
  const chartValues = merchantClaimsByRange[range];
  const chartLabels = range === "7 dagen"
    ? ["ma", "di", "wo", "do", "vr", "za", "zo"]
    : range === "90 dagen"
      ? ["week 1", "week 2", "week 3", "week 4", "week 5", "week 6", "week 7", "week 8", "week 9", "week 10", "week 11", "week 12"]
      : ["2 jun", "6 jun", "10 jun", "14 jun", "18 jun", "22 jun", "26 jun", "30 jun"];
  const maxClaims = useMemo(() => Math.max(...chartValues), [chartValues]);

  return (
    <DashboardShell>
      <DashboardHeading
        title="Goedemorgen,"
        accent="Woon & Co"
        subtitle="Je kortingsacties in één overzicht. Dit is wat er speelt bij jouw webshop."
        action={
          <Link
            href="/dashboard/offers?new=1"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark sm:px-7"
          >
            <DashboardIcon name="plus" size={20} />
            Nieuwe aanbieding
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard label="Actieve aanbiedingen" value={String(activeOffers)} helper="Momenteel actief" icon="tag" />
        <DashboardStatCard label="Beschikbare codes" value={formatCount(codeCount)} helper="Klaar om uit te geven" icon="ticket" />
        <DashboardStatCard label="Uitgegeven vouchers" value={formatCount(issuedCount)} helper="Totaal uitgegeven" icon="users" />
        <DashboardStatCard label="Geclaimde vouchers" value={formatCount(claimedCount)} helper="Door klanten geclaimd" icon="check" tone="green" />
      </section>

      <div className="mt-5 grid items-start gap-5 2xl:grid-cols-12">
        {/* Offers table */}
        <Panel className="2xl:col-span-7">
          <PanelHeading
            title="Jouw aanbiedingen"
            description="Overzicht van al je kortingsacties via ShopBonus."
            action={
              <Link href="/dashboard/offers" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-brand hover:underline">
                Alles beheren <DashboardIcon name="arrow" size={16} />
              </Link>
            }
          />

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[700px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-blue-50/70 text-xs font-extrabold text-muted">
                  <th className="rounded-l-xl px-3 py-3">Aanbieding</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Voorwaarde</th>
                  <th className="px-3 py-3 text-center">Voorraad</th>
                  <th className="px-3 py-3 text-center">Uitgegeven</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="rounded-r-xl px-3 py-3 text-right">Actie</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-blue-50 last:border-0">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-white">
                          <DashboardIcon name="ticket" size={20} />
                        </span>
                        <div>
                          <p className="font-extrabold text-navy">{offer.title}</p>
                          <p className="text-xs text-muted">Vanaf {offer.minimum}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-brand">{offer.type}</span></td>
                    <td className="px-3 py-4 font-semibold text-navy">{offer.minimum}</td>
                    <td className="px-3 py-4 text-center font-bold text-navy">{formatCount(offer.stock)}</td>
                    <td className="px-3 py-4 text-center font-bold text-navy">{formatCount(offer.issued)}</td>
                    <td className="px-3 py-4"><StatusPill status={offer.status} /></td>
                    <td className="px-3 py-4 text-right">
                      <Link href="/dashboard/offers" className="rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-extrabold text-brand hover:bg-blue-100">Beheren</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {offers.map((offer) => (
              <article key={offer.id} className="rounded-2xl border border-blue-50 bg-slate-50/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-white"><DashboardIcon name="ticket" /></span>
                    <div className="min-w-0"><p className="truncate font-extrabold text-navy">{offer.title}</p><p className="text-xs text-muted">{offer.type} · vanaf {offer.minimum}</p></div>
                  </div>
                  <StatusPill status={offer.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-xl bg-white p-3"><p className="text-xs text-muted">Voorraad</p><p className="font-extrabold text-navy">{formatCount(offer.stock)}</p></div>
                  <div className="rounded-xl bg-white p-3"><p className="text-xs text-muted">Uitgegeven</p><p className="font-extrabold text-navy">{formatCount(offer.issued)}</p></div>
                </div>
                <Link href="/dashboard/offers" className="mt-3 block rounded-xl bg-blue-50 py-2.5 text-center text-sm font-extrabold text-brand">Beheren</Link>
              </article>
            ))}
          </div>
        </Panel>

        {/* Alerts and chart */}
        <div className="space-y-5 2xl:col-span-5">
          <Panel>
            <PanelHeading
              title="Meldingen"
              action={<Link href="/dashboard/notifications" className="inline-flex items-center gap-1 text-sm font-extrabold text-brand hover:underline">Alles bekijken <DashboardIcon name="arrow" size={15} /></Link>}
            />
            <div className="space-y-2.5">
              {merchantNotifications.slice(0, 2).map((notice) => (
                <Link key={notice.id} href="/dashboard/notifications" className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white p-3 transition hover:border-brand/40 hover:bg-blue-50/30">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${notice.type === "warning" ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-brand"}`}>
                    <DashboardIcon name={notice.type === "warning" ? "alert" : "bell"} size={21} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-navy">{notice.title}</span>
                    <span className="block truncate text-xs text-muted">{notice.detail}</span>
                  </span>
                  <DashboardIcon name="chevron" size={17} className="shrink-0 text-muted" />
                </Link>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeading
              title="Claims afgelopen periode"
              action={
                <select value={range} onChange={(e) => setRange(e.target.value as keyof typeof merchantClaimsByRange)} className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy outline-none focus:border-brand">
                  {Object.keys(merchantClaimsByRange).map((item) => <option key={item}>{item}</option>)}
                </select>
              }
            />
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold text-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-brand" />
              Geclaimde vouchers <strong className="text-navy">{maxClaims} piek</strong>
            </div>
            <DashboardLineChart values={chartValues} id="merchant-claims" labels={chartLabels} height={225} />
          </Panel>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHeading title="Deze maand in het kort" description="Een snelle blik op de groei van je webshop via ShopBonus." />
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["Voucherweergaven", "1.284", "+18%", "eye" as const],
              ["Klikken naar webshop", "426", "+12%", "cursor" as const],
              ["Bestellingen", "74", "+9%", "cart" as const],
            ].map(([label, value, change, icon]) => (
              <div key={label as string} className="flex items-center gap-3 rounded-2xl bg-blue-50/60 p-4">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-white text-brand"><DashboardIcon name={icon as "eye" | "cursor" | "cart"} size={21} /></span>
                <div><p className="text-xs font-semibold text-muted">{label}</p><p className="text-xl font-black text-navy">{value}</p><p className="text-xs font-extrabold text-green-600">↗ {change}</p></div>
              </div>
            ))}
          </div>
        </Panel>
        <Panel className="flex flex-col justify-between bg-gradient-to-br from-blue-50 to-white">
          <div>
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm"><DashboardIcon name="gift" size={23} /></span>
            <h3 className="mt-4 text-lg font-black text-navy">Meer bereik, meer klanten</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">Geef je aanbiedingen een boost en bereik shoppers die klaar zijn om te kopen.</p>
          </div>
          <Link href="/dashboard/analytics" className="mt-4 inline-flex items-center gap-2 font-extrabold text-brand hover:underline">Bekijk je analyse <DashboardIcon name="arrow" size={16} /></Link>
        </Panel>
      </div>
    </DashboardShell>
  );
}
