"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/store/SessionContext";
import { useOptionalWorkspace } from "@/store/WorkspaceContext";
import Logo from "@/components/Logo";
import DashboardIcon, { type DashboardIconName } from "@/components/DashboardIcon";
import NotificationBell from "@/components/notifications/NotificationBell";
import { shopInitials } from "@/lib/merchantDashboard";

interface DashboardShellProps {
  children: React.ReactNode;
  admin?: boolean;
}

const merchantLinks: { href: string; label: string; icon: DashboardIconName }[] = [
  { href: "/dashboard", label: "Overzicht", icon: "grid" },
  { href: "/dashboard/webshops", label: "Webshops", icon: "store" },
  { href: "/dashboard/orders", label: "Orders", icon: "list" },
  { href: "/dashboard/offers", label: "Aanbiedingen", icon: "tag" },
  { href: "/dashboard/vouchers", label: "Vouchers", icon: "ticket" },
  { href: "/dashboard/banners", label: "Banners", icon: "cursor" },
  { href: "/dashboard/team", label: "Team", icon: "users" },
  { href: "/dashboard/notifications", label: "Meldingen", icon: "bell" },
  { href: "/dashboard/support", label: "Support", icon: "chat" },
  { href: "/dashboard/settings", label: "Instellingen", icon: "settings" },
];

const adminLinks: { href: string; label: string; icon: DashboardIconName }[] = [
  { href: "/admin", label: "Cockpit", icon: "grid" },
  { href: "/admin/webshops", label: "Webshops", icon: "store" },
  { href: "/admin/users", label: "Gebruikers", icon: "users" },
  { href: "/admin/incidents", label: "Incidenten", icon: "alert" },
  { href: "/admin/integrations", label: "Operations", icon: "sync" },
  { href: "/admin/wallets", label: "Financieel", icon: "wallet" },
  { href: "/admin/cms", label: "Content Studio", icon: "edit" },
  { href: "/admin/affiliate", label: "Affiliate", icon: "coins" },
  { href: "/admin/notifications", label: "Meldingen", icon: "bell" },
  { href: "/app/platform/notifications", label: "Templates", icon: "edit" },
  { href: "/admin/audit", label: "Audit", icon: "list" },
  { href: "/admin/settings", label: "Instellingen", icon: "settings" },
];

export default function DashboardShell({ children, admin = false }: DashboardShellProps) {
  const pathname = usePathname();
  const { session, signOut } = useSession();
  const router = useRouter();
  const workspace = useOptionalWorkspace();
  const workspaces = workspace?.workspaces ?? [];
  const current = workspace?.current ?? null;
  const select = workspace?.select;
  const switching = workspace?.switching ?? false;
  const [shopOpen, setShopOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const links = admin ? adminLinks : merchantLinks;

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setProfileOpen(false);
    setMobileNav(false);
    try {
      await signOut();
    } finally {
      router.replace("/account?mode=login");
    }
  }
  const notificationsHref = admin ? "/admin/notifications" : "/dashboard/notifications";
  const shopName = current?.name ?? "Webshop";
  const initials = shopInitials(shopName);
  const profileLetter = (session?.user.first_name || session?.email || "S").charAt(0).toUpperCase();
  const filteredWorkspaces = workspaces.filter((shop) => {
    const q = workspaceFilter.trim().toLowerCase();
    if (!q) return true;
    return shop.name.toLowerCase().includes(q) || shop.status.toLowerCase().includes(q);
  });
  const statusBadge = (status: string) => {
    if (status === "approved") return "text-green-700";
    if (status === "suspended" || status === "rejected") return "text-red-600";
    return "text-amber-700";
  };

  const active = (href: string) => {
    if (admin) {
      if (href === "/admin") return pathname === "/admin";
      return pathname === href || pathname.startsWith(`${href}/`);
    }
    return href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href.split("#")[0]);
  };

  const switchShop = async (id: string) => {
    setShopOpen(false);
    setMobileNav(false);
    await select?.(id);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f4f8ff_0%,#eef6ff_52%,#f8fbff_100%)]">
      <div className="sticky top-0 z-40 shadow-[0_4px_20px_-16px_rgba(10,27,63,0.35)]">
        {/* Top navbar: brand + workspace/account tools (above second nav for dropdowns) */}
        <header className="relative z-30 border-b border-blue-100/80 bg-white/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[72px] max-w-[1600px] items-center gap-3 px-4 sm:gap-4 sm:px-6 xl:px-8">
            <button
              type="button"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-100 text-navy lg:hidden"
              onClick={() => setMobileNav((v) => !v)}
              aria-label="Dashboardnavigatie"
              aria-expanded={mobileNav}
            >
              <DashboardIcon name={mobileNav ? "close" : "menu"} size={20} />
            </button>

            <Logo />

            <div className="relative z-40 ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {admin && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    router.push(`/admin?q=${encodeURIComponent(search)}`);
                  }}
                  className="hidden w-[220px] items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2 xl:flex"
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
                <div className="relative hidden sm:block">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      setShopOpen((v) => !v);
                    }}
                    disabled={switching || workspaces.length === 0}
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-2.5 py-1.5 transition hover:border-blue-300 disabled:opacity-60 sm:gap-3 sm:px-3 sm:py-2"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f6f1e8] text-[11px] font-black text-navy sm:h-9 sm:w-9">
                      {initials}
                    </span>
                    <span className="hidden max-w-[120px] truncate text-sm font-extrabold text-navy md:inline lg:max-w-[160px]">
                      {shopName}
                    </span>
                    {workspaces.length > 1 && (
                      <DashboardIcon name="chevron" size={16} className="rotate-90 text-muted" />
                    )}
                  </button>
                  {shopOpen && workspaces.length > 0 && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl">
                      {workspaces.length > 3 && (
                        <div className="mb-1 flex items-center gap-2 rounded-xl border border-blue-50 bg-slate-50 px-2.5 py-2">
                          <DashboardIcon name="search" size={14} className="text-muted" />
                          <input
                            value={workspaceFilter}
                            onChange={(e) => setWorkspaceFilter(e.target.value)}
                            placeholder="Zoek workspace…"
                            className="min-w-0 flex-1 bg-transparent text-xs text-navy outline-none"
                            autoFocus
                          />
                        </div>
                      )}
                      <div className="max-h-64 overflow-y-auto">
                        {filteredWorkspaces.map((shop) => (
                          <button
                            key={shop.id}
                            type="button"
                            onClick={() => void switchShop(shop.id)}
                            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold hover:bg-blue-50 ${
                              current?.id === shop.id ? "text-brand" : "text-navy"
                            }`}
                          >
                            <span className="truncate">{shop.name}</span>
                            <span className={`shrink-0 text-[10px] font-extrabold uppercase ${statusBadge(shop.status)}`}>
                              {shop.status}
                            </span>
                          </button>
                        ))}
                        {filteredWorkspaces.length === 0 && (
                          <p className="px-3 py-2 text-xs text-muted">Geen workspaces gevonden.</p>
                        )}
                      </div>
                      <a
                        href="/voor-webshops"
                        className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"
                      >
                        <DashboardIcon name="plus" size={14} />
                        Nieuwe webshop
                      </a>
                    </div>
                  )}
                </div>
              )}

              <NotificationBell viewAllHref={notificationsHref} />

              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShopOpen(false);
                    setProfileOpen((v) => !v);
                  }}
                  aria-label="Accountmenu"
                  aria-expanded={profileOpen}
                  className="flex items-center gap-1.5 rounded-full p-0.5 transition hover:bg-blue-50 sm:gap-2 sm:p-1"
                  data-testid="dashboard-profile"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-black text-navy sm:h-10 sm:w-10">
                    {admin ? "A" : profileLetter}
                  </span>
                  {admin && <span className="hidden text-xs font-bold text-navy md:inline">Super Admin</span>}
                  <DashboardIcon name="chevron" size={15} className="hidden rotate-90 text-muted sm:block" />
                </button>
                {profileOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-10 cursor-default"
                      aria-label="Accountmenu sluiten"
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-full z-50 mt-2 w-52 rounded-2xl border border-blue-100 bg-white p-2 shadow-xl">
                      <p className="px-3 py-2 text-sm font-extrabold text-navy">
                        {admin ? "Super Admin" : session?.user.first_name || shopName}
                      </p>
                      {!admin && workspaces.length > 0 && (
                        <div className="mb-1 border-b border-blue-50 pb-1 sm:hidden">
                          <p className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-muted">Workspace</p>
                          {workspaces.map((shop) => (
                            <button
                              key={shop.id}
                              type="button"
                              onClick={() => void switchShop(shop.id)}
                              className={`block w-full truncate rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-blue-50 ${
                                current?.id === shop.id ? "text-brand" : "text-navy"
                              }`}
                            >
                              {shop.name}
                            </button>
                          ))}
                        </div>
                      )}
                      <Link
                        href={admin ? "/admin/settings" : "/dashboard/settings"}
                        onClick={() => setProfileOpen(false)}
                        className="block rounded-xl px-3 py-2 text-sm font-semibold text-muted hover:bg-blue-50 hover:text-brand"
                      >
                        Instellingen
                      </Link>
                      <button
                        type="button"
                        disabled={loggingOut}
                        onClick={() => void handleLogout()}
                        className="block w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60"
                      >
                        {loggingOut ? "Uitloggen…" : "Uitloggen"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard navigation — below top navbar; keep under header dropdowns */}
        <nav
          className="relative z-10 hidden border-b border-blue-100/80 bg-white/95 backdrop-blur-xl lg:block"
          aria-label="Dashboardnavigatie"
          data-testid="dashboard-nav"
        >
          <div className="mx-auto max-w-[1600px] px-4 sm:px-6 xl:px-8">
            <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-2">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active(item.href) ? "page" : undefined}
                  title={item.label}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active(item.href)
                      ? "border-b-2 border-brand bg-blue-50 text-brand"
                      : "text-navy/85 hover:bg-slate-50 hover:text-brand"
                  }`}
                >
                  <DashboardIcon name={item.icon} size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {mobileNav && (
          <div className="border-b border-blue-100 bg-white px-4 py-3 lg:hidden" data-testid="dashboard-mobile-nav">
            <nav className="mb-3 grid gap-1" aria-label="Mobiele dashboardnavigatie">
              {links.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileNav(false)}
                  aria-current={active(item.href) ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                    active(item.href) ? "bg-blue-50 text-brand" : "text-navy hover:bg-slate-50"
                  }`}
                >
                  <DashboardIcon name={item.icon} size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
            {admin && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setMobileNav(false);
                  router.push(`/admin?q=${encodeURIComponent(search)}`);
                }}
                className="mb-2 flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3 py-2"
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
          </div>
        )}
      </div>

      <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-6 sm:py-9 xl:px-8">{children}</div>
    </div>
  );
}
