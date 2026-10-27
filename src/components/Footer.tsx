"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

export default function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/dashboard") || pathname === "/admin" || pathname === "/account") return null;

  return (
    <footer className="mt-20 bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-blue-100/80">
            Samen maken we online shoppen voordeliger. Cashback, kortingsvouchers en
            eerlijke deals bij honderden webshops.
          </p>
          <div className="mt-5 flex gap-2">
            {["70%", "consument"].map((_, i) => null)}
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">
              70% naar jou
            </span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">
              100% transparant
            </span>
          </div>
        </div>
        <div>
          <h4 className="font-extrabold">Ontdekken</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-blue-100/80">
            <li><Link href="/webshops" className="hover:text-white">Alle webshops</Link></li>
            <li><Link href="/mijn-voordelen" className="hover:text-white">Mijn voordelen</Link></li>
            <li><Link href="/hoe-werkt-het" className="hover:text-white">Hoe werkt het?</Link></li>
            <li><Link href="/over-ons" className="hover:text-white">Over ons</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-extrabold">Voor webshops</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-blue-100/80">
            <li><Link href="/voor-webshops" className="hover:text-white">Webshop aanmelden</Link></li>
            <li><Link href="/voor-webshops" className="hover:text-white">Voucher instellen</Link></li>
            <li><Link href="/over-ons" className="hover:text-white">Verdienmodel</Link></li>
            <li><Link href="/account" className="hover:text-white">Partner login</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-extrabold">Blijf op de hoogte</h4>
          <p className="mt-4 text-sm text-blue-100/80">
            Ontvang nieuwe vouchers en exclusieve deals.
          </p>
          <form
            className="mt-4 flex overflow-hidden rounded-2xl bg-white/10 p-1.5 backdrop-blur"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              placeholder="E-mailadres"
              className="w-full bg-transparent px-4 text-sm text-white placeholder:text-blue-100/60 focus:outline-none"
            />
            <button className="shrink-0 rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-dark">
              Aanmelden
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-blue-100/60 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 ShopBonus — Demo met dummy-data. Alle kortingen zijn fictief.</p>
          <div className="flex gap-5">
            <span className="cursor-pointer hover:text-white">Voorwaarden</span>
            <span className="cursor-pointer hover:text-white">Privacy</span>
            <span className="cursor-pointer hover:text-white">Cookies</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
