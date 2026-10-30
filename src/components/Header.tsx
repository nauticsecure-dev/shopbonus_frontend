"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import Logo from "./Logo";
import Icon from "./DashboardIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { useLocale } from "@/i18n/LocaleContext";
import { formatMinor } from "@/lib/money";
import { updateConsumerProfile } from "@/lib/profile";
import type { Locale } from "@/types/locale";

function isActive(pathname: string, href: string, search = "") {
  const [withoutHash] = href.split("#");
  const [target, query = ""] = withoutHash.split("?");
  if (target === "/") return pathname === "/";
  if (target === "/app/support") return pathname === "/app/support" || pathname.startsWith("/app/support/");
  if (pathname !== target && !pathname.startsWith(`${target}/`)) return false;
  if (!query) {
    // Exact dashboard home: active only when no conflicting tab query is present.
    if (target === "/mijn-voordelen") {
      const tab = new URLSearchParams(search).get("tab");
      return !tab || tab === "vouchers";
    }
    return true;
  }
  const wanted = new URLSearchParams(query);
  const current = new URLSearchParams(search);
  for (const [k, v] of wanted.entries()) {
    if (current.get(k) !== v) return false;
  }
  return true;
}

function focusHomeSearch() {
  const el = document.getElementById("home-search-input");
  if (el instanceof HTMLInputElement) {
    el.focus();
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

const HEADER_BAR =
  "sticky top-0 z-40 bg-[#0b74ff] text-white shadow-[0_8px_24px_-12px_rgba(11,116,255,0.65)]";

export default function Header() {
  return (
    <Suspense fallback={<header className={`${HEADER_BAR} h-[72px]`} aria-hidden />}>
      <HeaderInner />
    </Suspense>
  );
}

function HeaderInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { session, signOut } = useSession();
  const { availableMinor, pendingCashbackMinor, profile } = useShopBonus();
  const { locale, setLocale, dictionary: t } = useLocale();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const search = searchParams.toString() ? `?${searchParams.toString()}` : "";
  // Public pages always; login-only pages only when signed in.
  const links = [
    { href: "/webshops", label: t.navWebshops },
    ...(session ? [{ href: "/mijn-voordelen", label: t.navCashback }] : []),
    { href: "/kortingscodes", label: t.navDiscountCodes },
    { href: "/hoe-werkt-het", label: t.navHowItWorks },
    { href: "/over-ons", label: t.navAbout },
    { href: "/faq", label: t.navFaq },
    { href: "/over-ons#contact", label: t.navContact },
    { href: "/voor-webshops", label: t.navForMerchants },
  ];
  const displayName = session?.user.first_name || profile.firstName || "S";
  const avatarUrl = profile.avatarUrl;
  const canOpenDashboard =
    !!session?.user &&
    (session.user.workspaces.length > 0 ||
      session.user.destination === "workspace" ||
      session.user.roles.includes("super_admin"));

  function switchLocale(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    if (session?.user) {
      void updateConsumerProfile({ locale: next }, next).catch(() => undefined);
    }
  }

  // Merchant/admin shells use DashboardShell; keep the site header everywhere else.
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin") || pathname.startsWith("/app/platform")) {
    return null;
  }

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    setOpen(false);
    try {
      await signOut();
    } finally {
      router.replace("/account?mode=login");
    }
  }

  function onSearchClick() {
    if (pathname === "/") {
      focusHomeSearch();
      return;
    }
    router.push("/#home-search");
  }

  const avatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40" />
  ) : (
    <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 font-extrabold text-white">
      {displayName.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <header className={HEADER_BAR} data-testid="site-header">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <button
          aria-label={t.menu}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white lg:hidden"
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>

        <Logo light />

        <nav
          aria-label={t.mainNav}
          className="no-scrollbar hidden h-full min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto lg:flex xl:gap-2"
        >
          {links.map((link) => {
            const active = isActive(pathname, link.href, search);
            return (
              <Link
                key={link.href + link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full shrink-0 items-center whitespace-nowrap px-1.5 text-[13px] font-semibold transition xl:px-2 xl:text-sm ${
                  active
                    ? "text-white after:absolute after:inset-x-1 after:bottom-0 after:h-[3px] after:rounded-full after:bg-white"
                    : "text-white/90 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label={t.search}
            onClick={onSearchClick}
            className="hidden h-10 w-10 place-items-center rounded-full text-white/95 transition hover:bg-white/15 hover:text-white sm:grid"
            data-testid="header-search"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.2" />
              <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>

          <div
            className="hidden items-center rounded-full bg-white/15 p-0.5 text-xs font-extrabold sm:flex"
            role="group"
            aria-label={t.language}
          >
            {(["nl", "en"] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={locale === code}
                onClick={() => switchLocale(code)}
                className={`rounded-full px-2.5 py-1.5 uppercase transition ${
                  locale === code ? "bg-white text-brand" : "text-white/90 hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {session ? (
            <>
              <Link
                href="/mijn-voordelen"
                className="hidden items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-bold text-navy shadow-sm transition hover:bg-blue-50 md:flex"
                title={
                  pendingCashbackMinor > 0
                    ? `${formatMinor(availableMinor)} beschikbaar · ${formatMinor(pendingCashbackMinor)} cashback in behandeling`
                    : `${formatMinor(availableMinor)} beschikbaar`
                }
              >
                <Icon name="wallet" size={18} className="text-brand" />
                <span className="hidden text-xs font-semibold text-muted lg:inline">Mijn ShopBonus-tegoed</span>
                <strong className="text-navy">{formatMinor(availableMinor)}</strong>
                {pendingCashbackMinor > 0 && (
                  <span className="hidden rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 xl:inline">
                    +{formatMinor(pendingCashbackMinor)} pending
                  </span>
                )}
                <Icon name="chevron" size={14} className="text-muted" />
              </Link>
              <div className="hidden sm:block">
                <NotificationBell viewAllHref="/app/notifications" variant="brand" />
              </div>
              <div className="relative">
                <button
                  aria-label="Accountmenu"
                  aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2"
                  data-testid="header-profile"
                >
                  {avatar}
                  <Icon name="chevron" size={15} className="hidden rotate-90 text-white/80 sm:block" />
                </button>
                {profileOpen && (
                  <>
                    <button
                      className="fixed inset-0 cursor-default"
                      aria-label="Accountmenu sluiten"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 z-10 mt-3 w-56 rounded-2xl border border-blue-100 bg-white p-2 text-navy shadow-xl">
                      <p className="truncate px-3 py-2 text-xs text-muted">{session.email}</p>
                      {canOpenDashboard && (
                        <Link
                          href="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="block rounded-lg px-3 py-2 text-sm font-bold text-brand hover:bg-blue-50"
                        >
                          Webshop dashboard
                        </Link>
                      )}
                      <Link
                        href="/mijn-voordelen"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        {t.navBenefits}
                      </Link>
                      <Link
                        href="/mijn-voordelen?tab=transacties"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        {t.navPoints}
                      </Link>
                      <Link
                        href="/mijn-voordelen?tab=vouchers"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        {t.navVouchers}
                      </Link>
                      <Link
                        href="/profiel"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        {t.navProfile}
                      </Link>
                      <Link
                        href="/app/support"
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm hover:bg-blue-50"
                      >
                        Support
                      </Link>
                      <button
                        type="button"
                        disabled={loggingOut}
                        onClick={() => void logout()}
                        className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        {loggingOut ? `${t.logout}…` : t.logout}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Link
                href="/account?mode=login"
                className="hidden text-sm font-semibold text-white/95 hover:text-white sm:inline"
                data-testid="header-login"
              >
                {t.login}
              </Link>
              {pathname !== "/account" && (
                <Link
                  href="/account"
                  className="hidden rounded-full bg-white px-5 py-2.5 text-sm font-extrabold text-brand shadow-sm transition hover:bg-blue-50 sm:inline-flex"
                  data-testid="header-register"
                >
                  {t.register}
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {open && (
        <nav aria-label={t.mobileNav} className="space-y-1 border-t border-white/15 bg-[#0b74ff] p-4 lg:hidden">
          {session && (
            <Link
              href="/mijn-voordelen"
              onClick={() => setOpen(false)}
              className="mb-2 flex items-center justify-between rounded-xl bg-white/15 px-3 py-3 text-sm font-bold text-white"
            >
              <span>Mijn ShopBonus-tegoed</span>
              <strong>{formatMinor(availableMinor)}</strong>
            </Link>
          )}
          {session && (
            <Link
              href="/app/notifications"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              {t.notifications}
            </Link>
          )}
          {links.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 text-sm font-bold text-white hover:bg-white/10"
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onSearchClick();
            }}
            className="block w-full rounded-xl px-3 py-3 text-left text-sm font-bold text-white hover:bg-white/10"
          >
            Zoeken
          </button>
          {canOpenDashboard && (
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-3 font-bold text-white hover:bg-white/10"
            >
              Webshop dashboard
            </Link>
          )}
          {session ? (
            <button
              type="button"
              disabled={loggingOut}
              onClick={() => void logout()}
              className="px-3 py-3 text-sm text-red-100 disabled:opacity-60"
            >
              {loggingOut ? `${t.logout}…` : t.logout}
            </button>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/account?mode=login"
                onClick={() => setOpen(false)}
                className="block rounded-xl bg-white/15 px-3 py-3 text-center font-bold text-white"
              >
                {t.login}
              </Link>
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="block rounded-xl bg-white px-3 py-3 text-center font-extrabold text-brand"
              >
                {t.register}
              </Link>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
