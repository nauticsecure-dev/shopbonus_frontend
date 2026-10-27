"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/features/auth/SessionContext";
import Logo from "@/components/Logo";
import DashboardIcon, { type DashboardIconName } from "@/features/dashboard/components/DashboardIcon";
import { merchantShop } from "@/fixtures/dashboard";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

interface DashboardShellProps {
  children: React.ReactNode;
  admin?: boolean;
}

const merchantLinks: { href: string; label: string; icon: DashboardIconName }[] = [
  { href: "/dashboard", label: "Overzicht", icon: "grid" },
  { href: "/dashboard/offers", label: "Aanbiedingen & codes", icon: "tag" },
  { href: "/dashboard/notifications", label: "Meldingen", icon: "bell" },
  { href: "/dashboard/analytics", label: "Analyse", icon: "chart" },
  { href: "/dashboard/settings", label: "Instellingen", icon: "settings" },
];

const adminLinks: { href: string; label: string; icon: DashboardIconName }[] = [
  { href: "/admin", label: "Cockpit", icon: "grid" },
  { href: "/admin#webshops", label: "Webshops", icon: "store" },
  { href: "/admin#affiliate", label: "Affiliate & wallet", icon: "users" },
  { href: "/admin#support", label: "Support", icon: "chat" },
  { href: "/admin#settings", label: "Instellingen", icon: "settings" },
];

export default function DashboardShell({ children, admin = false }: DashboardShellProps) {
  const pathname = usePathname();
  const { signOut } = useSession();
  const router = useRouter();
  const { profile } = useShopBonus();
  const [shopOpen, setShopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState(merchantShop.name);
  const links = admin ? adminLinks : merchantLinks;

  const active = (href: string) => {
    if (admin) return href === "/admin" && pathname === "/admin";
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href.split("#")[0]);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4f8ff_0%,#eef6ff_52%,#f8fbff_100%)]">
      <header className="sticky top-0 z-40 border-b border-blue-100/80 bg-white/95 shadow-[0_4px_20px_-16px_rgba(10,27,63,0.35)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-6">
            <Logo />
            <nav className="hidden items-center gap-1 2xl:flex">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-[14px] font-bold transition ${
                    active(item.href)
                      ? "bg-blue-50 text-brand"
                      : "text-navy/85 hover:bg-slate-50 hover:text-brand"
                  }`}
                >
                  <DashboardIcon name={item.icon} size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {admin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  router.push(`/admin?q=${encodeURIComponent(search)}`);
                }}
                className="flex w-[250px] items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2"
              >
                <DashboardIcon name="search" size={17} className="text-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek webshop, voucher…"
                  className="min-w-0 flex-1 text-xs text-navy outline-none placeholder:text-muted/70"
                />
              </form>
            )}

            {!admin && (
              <div className="relative">
                <button
                  onClick={() => setShopOpen((v) => !v)}
                  className="flex items-center gap-3 rounded-xl border border-blue-100 bg-white px-3 py-2 transition hover:border-blue-300"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f6f1e8] text-[11px] font-black text-navy">W&Co</span>
                  <span className="max-w-[115px] truncate text-sm font-extrabold text-navy">{selectedShop}</span>
                  <DashboardIcon name="chevron" size={16} className="rotate-90 text-muted" />
                </button>
                {shopOpen && (
                  <div className="absolute right-0 top-full z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl">
                    {["Woon & Co", "Techwinkel", "Modehuis"].map((shop) => (
                      <button
                        key={shop}
                        onClick={() => {
                          setSelectedShop(shop);
                          setShopOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-blue-50 ${selectedShop === shop ? "text-brand" : "text-navy"}`}
                      >
                        {shop}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Link
              href={admin ? "/admin#actions" : "/dashboard/notifications"}
              className="relative grid h-10 w-10 place-items-center rounded-xl text-navy transition hover:bg-blue-50 hover:text-brand"
              aria-label="Meldingen"
            >
              <DashboardIcon name="bell" size={21} />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-red-500" />
            </Link>

            <div className="relative">
              <button
                onClick={() => setProfileOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full p-1 transition hover:bg-blue-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-sm font-black text-navy">
                  {admin ? "A" : profile.firstName.charAt(0).toUpperCase()}
                </span>
                {admin && <span className="text-xs font-bold text-navy">Super Admin</span>}
                <DashboardIcon name="chevron" size={15} className="rotate-90 text-muted" />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full z-20 mt-2 w-52 rounded-2xl border border-blue-100 bg-white p-2 shadow-xl">
                  <p className="px-3 py-2 text-sm font-extrabold text-navy">{admin ? "Super Admin" : selectedShop}</p>
                  <Link href={admin ? "/admin#settings" : "/dashboard/settings"} onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-blue-50 hover:text-brand">Instellingen</Link>
                  <Link href="/account?mode=login" onClick={() => { signOut(); setProfileOpen(false); }} className="block rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">Uitloggen</Link>
                </div>
              )}
            </div>
          </div>

          <button
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 text-navy 2xl:hidden"
            onClick={() => setMobileNav((v) => !v)}
            aria-label="Dashboardnavigatie" aria-expanded={mobileNav}
          >
            <DashboardIcon name={mobileNav ? "close" : "menu"} size={20} />
          </button>
        </div>

        {/* Compact horizontal navigation for tablet/mobile */}
        <nav className="no-scrollbar flex overflow-x-auto border-t border-blue-50 px-3 py-2 2xl:hidden">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                active(item.href) ? "bg-blue-50 text-brand" : "text-muted hover:bg-slate-50"
              }`}
            >
              <DashboardIcon name={item.icon} size={16} />
              {item.label}
            </Link>
          ))}
        </nav>

        {mobileNav && (
          <div className="border-t border-blue-100 bg-white px-4 py-3 2xl:hidden">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-blue-50 px-3 py-2">
              <span className="text-sm font-bold text-navy">{admin ? "Super Admin" : selectedShop}</span>
              {!admin && <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)} className="rounded-lg border border-blue-100 bg-white px-2 py-1 text-xs font-bold text-navy"><option>Woon & Co</option><option>Techwinkel</option><option>Modehuis</option></select>}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/account?mode=login" onClick={() => { signOut(); setMobileNav(false); }} className="rounded-xl px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50">Uitloggen</Link>
              <Link href={admin ? "/admin#actions" : "/dashboard/notifications"} onClick={() => setMobileNav(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-navy hover:bg-blue-50">Meldingen</Link>
              <Link href={admin ? "/admin#settings" : "/dashboard/settings"} onClick={() => setMobileNav(false)} className="rounded-xl px-3 py-2.5 text-sm font-bold text-navy hover:bg-blue-50">Instellingen</Link>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 xl:px-8">
        {children}
      </div>
    </div>
  );
}
