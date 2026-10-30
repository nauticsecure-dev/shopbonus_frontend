"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DashboardIcon from "@/components/DashboardIcon";
import { useLocale } from "@/i18n/LocaleContext";
import { useCentralNotifications } from "@/hooks/useCentralNotifications";
import {
  formatRelativeTime,
  notificationIcon,
  notificationTone,
  resolveNotificationHref,
  type CentralNotification,
} from "@/lib/notifications";

type Props = {
  /** Full notification center URL for this surface. */
  viewAllHref: string;
  /** Compact styling for consumer header on blue chrome. */
  variant?: "light" | "brand";
  className?: string;
};

function toneClasses(type: string): string {
  const tone = notificationTone(type);
  if (tone === "critical") return "bg-red-100 text-red-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "success") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-brand";
}

export default function NotificationBell({ viewAllHref, variant = "light", className = "" }: Props) {
  const { locale, dictionary: t } = useLocale();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    items,
    unreadCount,
    loading,
    error,
    toast,
    dismissToast,
    refresh,
    markRead,
    markAllRead,
  } = useCentralNotifications({ list: true, filter: "all", page: 1, perPage: 8, enabled: true });

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissToast(), 5000);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  const openItem = async (notice: CentralNotification) => {
    try {
      if (!notice.read_at) await markRead(notice.id);
    } catch {
      /* navigate anyway */
    }
    setOpen(false);
  };

  const onMarkAll = async () => {
    try {
      await markAllRead();
    } catch {
      /* keep panel open */
    }
  };

  const bellBtn =
    variant === "brand"
      ? "relative grid h-10 w-10 place-items-center rounded-full text-white/95 transition hover:bg-white/15"
      : "relative grid h-10 w-10 place-items-center rounded-xl text-navy transition hover:bg-blue-50 hover:text-brand";

  return (
    <div className={`relative ${className}`} ref={panelRef} data-testid="notification-bell">
      <button
        type="button"
        className={bellBtn}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} ${t.notificationsUnread}`
            : t.notifications
        }
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) void refresh();
        }}
        data-testid="notification-bell-button"
      >
        <DashboardIcon name="bell" size={21} />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1 text-[10px] font-black text-white"
            data-testid="notification-unread-badge"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {toast && (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-80 rounded-2xl border border-blue-100 bg-white p-3 shadow-xl"
          role="status"
          data-testid="notification-toast"
        >
          <div className="flex items-start gap-2">
            <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${toneClasses(toast.type)}`}>
              <DashboardIcon name={notificationIcon(toast.type)} size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-navy">{toast.title}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted">{toast.body}</p>
            </div>
            <button type="button" onClick={dismissToast} className="text-muted hover:text-navy" aria-label={t.close}>
              <DashboardIcon name="close" size={14} />
            </button>
          </div>
        </div>
      )}

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-[min(100vw-1.5rem,24rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl"
          role="dialog"
          aria-label={t.notifications}
          data-testid="notification-dropdown"
        >
          <div className="flex items-center justify-between gap-2 border-b border-blue-50 px-4 py-3">
            <div>
              <p className="text-sm font-black text-navy">{t.notifications}</p>
              <p className="text-xs text-muted">
                {unreadCount} {t.notificationsUnread}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void onMarkAll()}
                className="rounded-lg px-2 py-1 text-xs font-extrabold text-brand hover:bg-blue-50"
                data-testid="notification-mark-all"
              >
                {t.notificationsMarkAll}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && items.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">{t.loading}</p>
            )}
            {error && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-red-600">{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-2 text-xs font-extrabold text-brand"
                >
                  {t.retry}
                </button>
              </div>
            )}
            {!loading && !error && items.length === 0 && (
              <div className="px-4 py-10 text-center" data-testid="notification-empty">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-green-50 text-green-600">
                  <DashboardIcon name="check" size={22} />
                </span>
                <p className="mt-3 text-sm font-extrabold text-navy">{t.notificationsEmpty}</p>
              </div>
            )}
            {items.map((notice) => {
              const href = resolveNotificationHref(notice.action_route, notice.type);
              return (
                <Link
                  key={notice.id}
                  href={href}
                  onClick={() => void openItem(notice)}
                  className={`flex items-start gap-3 border-b border-slate-50 px-4 py-3 transition hover:bg-blue-50/60 ${
                    !notice.read_at ? "bg-blue-50/40" : ""
                  }`}
                  data-testid="notification-item"
                >
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClasses(notice.type)}`}>
                    <DashboardIcon name={notificationIcon(notice.type)} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className="line-clamp-1 text-sm font-extrabold text-navy">{notice.title}</span>
                      {!notice.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    </span>
                    <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{notice.body}</span>
                    <span className="mt-1 block text-[11px] font-semibold text-muted">
                      {formatRelativeTime(notice.created_at, locale)}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="border-t border-blue-50 p-2">
            <Link
              href={viewAllHref}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"
              data-testid="notification-view-all"
            >
              {t.notificationsViewAll}
              <DashboardIcon name="arrow" size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
