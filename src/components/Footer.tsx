"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { openCookieSettings } from "@/lib/cookies";

export default function Footer() {
  const pathname = usePathname();
  const { dictionary: t, locale } = useLocale();
  const { session } = useSession();
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname === "/account") return null;

  const legalSlug = (nl: string, en: string) => (locale === "en" ? en : nl);

  return (
    <footer className="mt-20 bg-navy text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4 lg:px-8">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-blue-100/80">{t.footerTagline}</p>
          <div className="mt-5 flex gap-2">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">{t.footerShare}</span>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold">{t.footerTransparent}</span>
          </div>
        </div>
        <div>
          <h4 className="font-extrabold">{t.footerDiscover}</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-blue-100/80">
            <li>
              <Link href="/webshops" className="hover:text-white">
                {t.footerAllShops}
              </Link>
            </li>
            {session && (
              <li>
                <Link href="/mijn-voordelen" className="hover:text-white">
                  {t.footerMyBenefits}
                </Link>
              </li>
            )}
            <li>
              <Link href="/hoe-werkt-het" className="hover:text-white">
                {t.footerHow}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-white">
                {t.navFaq}
              </Link>
            </li>
            <li>
              <Link href="/over-ons" className="hover:text-white">
                {t.footerAbout}
              </Link>
            </li>
            <li>
              <Link href="/over-ons#contact" className="hover:text-white">
                {t.navContact}
              </Link>
            </li>
            <li>
              <Link href="/kortingscodes" className="hover:text-white">
                {t.navDiscountCodes}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-extrabold">{t.footerMerchants}</h4>
          <ul className="mt-4 space-y-2.5 text-sm text-blue-100/80">
            <li>
              <Link href="/voor-webshops" className="hover:text-white">
                {t.footerJoinShop}
              </Link>
            </li>
            <li>
              <Link href="/voor-webshops/aanmelden" className="hover:text-white">
                {t.footerSetupVoucher}
              </Link>
            </li>
            <li>
              <Link href="/over-ons" className="hover:text-white">
                {t.footerModel}
              </Link>
            </li>
            <li>
              <Link href="/account" className="hover:text-white">
                {t.footerPartnerLogin}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-extrabold">{t.footerStayInformed}</h4>
          <p className="mt-4 text-sm text-blue-100/80">{t.footerNewsletter}</p>
          <div className="mt-4 space-y-3">
            <Link
              href="/account"
              className="inline-flex rounded-xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-brand-dark"
            >
              {t.register}
            </Link>
            <p className="text-xs text-blue-100/60">
              Optionele marketingcommunicatie stel je in via je{" "}
              <Link href="/profiel" className="underline hover:text-white">
                {t.navProfile}
              </Link>
              . Transactionele berichten blijven altijd actief.
            </p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-blue-100/60 sm:flex-row sm:px-6 lg:px-8">
          <p>© 2026 ShopBonus</p>
          <div className="flex flex-wrap justify-center gap-5">
            <Link href={`/pagina/${legalSlug("voorwaarden", "terms")}`} className="hover:text-white">
              {t.footerTerms}
            </Link>
            <Link href={`/pagina/${legalSlug("privacy", "privacy")}`} className="hover:text-white">
              {t.footerPrivacy}
            </Link>
            <Link href={`/pagina/${legalSlug("cookies", "cookies")}`} className="hover:text-white">
              {t.footerCookies}
            </Link>
            <button
              type="button"
              onClick={() => openCookieSettings()}
              className="hover:text-white"
              data-testid="footer-cookie-settings"
            >
              {t.footerCookieSettings}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
