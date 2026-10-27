"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import DashboardIcon from "@/features/dashboard/components/DashboardIcon";
import { DashboardHeading, Panel, StatusPill } from "@/features/dashboard/components/DashboardPrimitives";
import { merchantNotifications as initialNotifications } from "@/fixtures/dashboard";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

export default function DashboardNotificationsPage() {
  const { pushToast } = useShopBonus();
  const [notices, setNotices] = useState(initialNotifications);
  const unread = notices.filter((notice) => notice.unread).length;

  const markAllRead = () => {
    setNotices((current) => current.map((notice) => ({ ...notice, unread: false })));
    pushToast({ title: "Meldingen bijgewerkt", message: "Alle meldingen zijn als gelezen gemarkeerd.", kind: "success" });
  };

  const dismiss = (id: string) => setNotices((current) => current.filter((notice) => notice.id !== id));

  return (
    <DashboardShell>
      <DashboardHeading
        title="Meldingen"
        accent="en updates"
        subtitle={`${unread} ongelezen melding${unread === 1 ? "" : "en"} over je webshop en aanbiedingen.`}
        action={<button onClick={markAllRead} className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-extrabold text-brand hover:bg-blue-50">Alles als gelezen</button>}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.75fr)]">
        <Panel>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><h2 className="text-xl font-black text-navy">Recent</h2><p className="text-sm text-muted">Belangrijke updates verschijnen hier.</p></div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-brand">{notices.length} totaal</span>
          </div>
          {notices.length === 0 ? (
            <div className="py-12 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-600"><DashboardIcon name="check" size={26} /></span><p className="mt-3 font-extrabold text-navy">Je bent helemaal bij</p><p className="text-sm text-muted">Er zijn geen open meldingen.</p></div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <article key={notice.id} className={`flex items-start gap-3 rounded-2xl border p-4 transition ${notice.unread ? "border-blue-200 bg-blue-50/50" : "border-slate-100 bg-white"}`}>
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${notice.type === "warning" ? "bg-amber-100 text-amber-600" : notice.type === "sale" ? "bg-green-100 text-green-600" : "bg-blue-100 text-brand"}`}>
                    <DashboardIcon name={notice.type === "warning" ? "alert" : notice.type === "sale" ? "cart" : "bell"} size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-extrabold text-navy">{notice.title}</h3>{notice.unread && <span className="h-2 w-2 rounded-full bg-brand" />}</div>
                    <p className="mt-1 text-sm text-muted">{notice.detail}</p>
                    <p className="mt-2 text-xs font-semibold text-muted">{notice.time}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link href={notice.type === "warning" ? "/dashboard/offers" : "/dashboard/analytics"} onClick={() => setNotices((current) => current.map((n) => n.id === notice.id ? { ...n, unread: false } : n))} className="rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-brand shadow-sm hover:bg-blue-100">Bekijk details</Link>
                      <button onClick={() => dismiss(notice.id)} className="rounded-lg px-3 py-2 text-xs font-bold text-muted hover:bg-white">Verwijderen</button>
                    </div>
                  </div>
                  <StatusPill status={notice.unread ? "Nieuw" : "Gelezen"} />
                </article>
              ))}
            </div>
          )}
        </Panel>

        <aside className="space-y-4">
          <Panel className="bg-gradient-to-br from-blue-50 to-white">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm"><DashboardIcon name="bell" size={22} /></span>
            <h3 className="mt-4 text-lg font-black text-navy">Blijf op de hoogte</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Kies welke updates je wilt ontvangen en hoe vaak ShopBonus je informeert.</p>
            <Link href="/dashboard/settings" className="mt-4 inline-flex items-center gap-2 font-extrabold text-brand hover:underline">Meldingen instellen <DashboardIcon name="arrow" size={16} /></Link>
          </Panel>
          <Panel>
            <h3 className="font-black text-navy">Meldingentypen</h3>
            <div className="mt-4 space-y-3 text-sm">
              {[["Voorraad", "alert", "text-amber-600"], ["Voucherclaims", "ticket", "text-brand"], ["Bestellingen", "cart", "text-green-600"]].map(([label, icon, color]) => <div key={label} className="flex items-center gap-3"><span className={`grid h-9 w-9 place-items-center rounded-xl bg-slate-50 ${color}`}><DashboardIcon name={icon as "alert" | "ticket" | "cart"} size={18} /></span><span className="font-semibold text-navy">{label}</span><span className="ml-auto text-xs font-bold text-muted">Aan</span></div>)}
            </div>
          </Panel>
        </aside>
      </div>
    </DashboardShell>
  );
}
