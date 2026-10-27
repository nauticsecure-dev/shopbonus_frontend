"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "./Logo";
import Icon from "@/features/dashboard/components/DashboardIcon";
import { useSession } from "@/features/auth/SessionContext";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";
import { formatEuro } from "@/fixtures/dummy";

const publicLinks = [
  { href: "/webshops", label: "Webshops" },
  { href: "/hoe-werkt-het", label: "Hoe werkt het?" },
  { href: "/voor-webshops", label: "Voor webshops" },
];
const memberLinks = [
  { href: "/webshops", label: "Webshops" },
  { href: "/mijn-voordelen", label: "Mijn voordelen" },
  { href: "/profiel", label: "Profiel" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, signOut } = useSession();
  const { balance, profile, pushToast } = useShopBonus();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const links = session ? memberLinks : publicLinks;
  if (pathname.startsWith("/dashboard") || pathname === "/admin") return null;

  async function logout() { try { await signOut(); setProfileOpen(false); setOpen(false); router.push("/account?mode=login"); } catch (error) { pushToast({ title: "Uitloggen mislukt", message: error instanceof Error ? error.message : "Probeer opnieuw.", kind: "error" }); } }
  return <header className="sticky top-0 z-40 border-b border-blue-100/70 bg-white/95 backdrop-blur-md">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
      <Logo/>
      <nav aria-label="Hoofdnavigatie" className="hidden h-full items-center gap-8 md:flex">
        {links.map(link => <Link key={link.href} href={link.href} aria-current={pathname.startsWith(link.href) ? "page" : undefined} className={`relative flex h-full items-center whitespace-nowrap text-sm font-semibold transition hover:text-brand ${pathname.startsWith(link.href) ? "text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand" : "text-navy"}`}>{link.label}</Link>)}
      </nav>
      <div className="hidden items-center gap-4 md:flex">
        {session ? <>
          <Link href="/mijn-voordelen" className="flex items-center gap-3 rounded-full bg-blue-50 px-4 py-2 text-navy"><Icon name="wallet" size={23} className="text-brand"/><span><span className="hidden text-[10px] text-muted lg:block">Mijn ShopBonus-tegoed</span><strong className="text-sm">{balance===null?"—":formatEuro(balance)}</strong></span></Link>
          <div className="relative">
            <button aria-label="Accountmenu" aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 font-extrabold text-navy">{profile.firstName.charAt(0).toUpperCase()}</span><Icon name="chevron" size={15} className="rotate-90"/></button>
            {profileOpen && <><button className="fixed inset-0 cursor-default" aria-label="Accountmenu sluiten" onClick={() => setProfileOpen(false)}/><div className="absolute right-0 z-10 mt-3 w-56 rounded-2xl border border-blue-100 bg-white p-2 shadow-xl"><p className="truncate px-3 py-2 text-xs text-muted">{session.email}</p>{session.role === "merchant" && <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-bold text-brand hover:bg-blue-50">Webshop dashboard</Link>}<Link href="/profiel" onClick={() => setProfileOpen(false)} className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50">Mijn profiel</Link><button onClick={logout} className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">Uitloggen</button></div></>}
          </div>
        </> : <><Link href="/account?mode=login" className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-2.5 text-sm font-bold text-brand hover:bg-blue-100">Inloggen</Link>{pathname !== "/account" && <Link href="/account" className="hidden rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white xl:block">Account aanmaken</Link>}</>}
      </div>
      <button aria-label="Navigatiemenu" aria-expanded={open} onClick={() => setOpen(!open)} className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand md:hidden"><Icon name={open ? "close" : "menu"} size={22}/></button>
    </div>
    {open && <nav aria-label="Mobiele navigatie" className="space-y-1 border-t border-blue-50 bg-white p-4 md:hidden">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 text-sm font-bold text-navy hover:bg-blue-50">{link.label}</Link>)}{session?.role === "merchant" && <Link href="/dashboard" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-3 font-bold text-brand">Webshop dashboard</Link>}{session ? <button onClick={logout} className="px-3 py-3 text-sm text-red-600">Uitloggen</button> : <Link href="/account?mode=login" onClick={() => setOpen(false)} className="block rounded-xl bg-blue-50 px-3 py-3 font-bold text-brand">Inloggen / account aanmaken</Link>}</nav>}
  </header>;
}
