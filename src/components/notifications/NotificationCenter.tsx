"use client";

import Link from "next/link";
import { useState } from "react";
import DashboardIcon from "@/components/DashboardIcon";
import { useLocale } from "@/i18n/LocaleContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { ApiError } from "@/lib/api";
import { useCentralNotifications } from "@/hooks/useCentralNotifications";
import {
  formatRelativeTime,
  notificationIcon,
  notificationTone,
  resolveNotificationHref,
  type CentralNotification,
  type NotificationFilter,
} from "@/lib/notifications";

type Props = {
  /** Optional preferences link for the sidebar. */
  preferencesHref?: string;
  title?: string;
  subtitle?: string;
};

function toneClasses(type: string): string {
  const tone = notificationTone(type);
  if (tone === "critical") return "bg-red-100 text-red-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "success") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-brand";
}

export default function NotificationCenter({
  preferencesHref,
  title,
  subtitle,
}: Props) {
  const { locale, dictionary: t } = useLocale();
  const { pushToast } = useShopBonus();
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const {
    items,
    unreadCount,
    total,
    currentPage,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  } = useCentralNotifications({ list: true, filter, page, perPage });

  const lastPage = Math.max(1, Math.ceil(total / perPage));

  const onMarkAll = async () => {
    try {
      await markAllRead();
      pushToast({
        title: t.notificationsUpdated,
        message: t.notificationsMarkAllDone,
        kind: "success",
      });
    } catch (err) {
      pushToast({
        title: t.errorGeneric,
        message: err instanceof ApiError ? err.message : t.errorGeneric,
        kind: "error",
      });
    }
  };

  const openNotice = async (notice: CentralNotification) => {
    try {
      if (!notice.read_at) await markRead(notice.id);
    } catch {
      /* continue */
    }
  };

  return (
    <div data-testid="notification-center">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy sm:text-4xl">
            {title ?? t.notifications}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {subtitle ??
              `${unreadCount} ${t.notificationsUnread}${unreadCount === 1 ? "" : locale === "en" ? "s" : ""}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onMarkAll()}
          disabled={unreadCount === 0}
          className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-extrabold text-brand hover:bg-blue-50 disabled:opacity-40"
          data-testid="notification-center-mark-all"
        >
          {t.notificationsMarkAll}
        </button>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "unread"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
              filter === value
                ? "bg-brand text-white"
                : "bg-white text-navy ring-1 ring-blue-100 hover:bg-blue-50"
            }`}
            data-testid={`notification-filter-${value}`}
          >
            {value === "all" ? t.notificationsFilterAll : t.notificationsFilterUnread}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl bg-white px-3 py-2 text-xs font-extrabold"
          >
            {t.retry}
          </button>
        </div>
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.75fr)]">
        <section className="rounded-3xl border border-blue-100/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-navy">{t.notificationsRecent}</h2>
              <p className="text-sm text-muted">{t.notificationsRecentHint}</p>
            </div>
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-brand">
              {total} {t.notificationsTotal}
            </span>
          </div>

          {loading && items.length === 0 && (
            <p className="py-12 text-center text-sm text-muted">{t.loading}</p>
          )}

          {!loading && items.length === 0 && (
            <div className="py-12 text-center" data-testid="notification-center-empty">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-green-50 text-green-600">
                <DashboardIcon name="check" size={26} />
              </span>
              <p className="mt-3 font-extrabold text-navy">{t.notificationsEmpty}</p>
              <p className="text-sm text-muted">{t.notificationsEmptyHint}</p>
            </div>
          )}

          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((notice) => {
                const href = resolveNotificationHref(notice.action_route, notice.type);
                return (
                  <article
                    key={notice.id}
                    className={`flex items-start gap-3 rounded-2xl border p-4 transition ${
                      !notice.read_at ? "border-blue-200 bg-blue-50/50" : "border-slate-100 bg-white"
                    }`}
                    data-testid="notification-center-item"
                  >
                    <span
                      className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${toneClasses(notice.type)}`}
                    >
                      <DashboardIcon name={notificationIcon(notice.type)} size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-navy">{notice.title}</h3>
                        {!notice.read_at && <span className="h-2 w-2 rounded-full bg-brand" />}
                      </div>
                      <p className="mt-1 text-sm text-muted">{notice.body}</p>
                      <p className="mt-2 text-xs font-semibold text-muted">
                        {formatRelativeTime(notice.created_at, locale)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={href}
                          onClick={() => void openNotice(notice)}
                          className="rounded-lg bg-white px-3 py-2 text-xs font-extrabold text-brand shadow-sm hover:bg-blue-100"
                        >
                          {notice.action_label || t.notificationsViewDetails}
                        </Link>
                        {!notice.read_at && (
                          <button
                            type="button"
                            onClick={() => void markRead(notice.id)}
                            className="rounded-lg px-3 py-2 text-xs font-extrabold text-muted hover:bg-slate-50"
                          >
                            {t.notificationsMarkRead}
                          </button>
                        )}
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase ${
                        !notice.read_at ? "bg-brand/10 text-brand" : "bg-slate-100 text-muted"
                      }`}
                    >
                      {!notice.read_at ? t.notificationsNew : t.notificationsRead}
                    </span>
                  </article>
                );
              })}
            </div>
          )}

          {lastPage > 1 && (
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={currentPage <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-blue-100 px-3 py-2 text-xs font-extrabold text-navy disabled:opacity-40"
              >
                {t.prev}
              </button>
              <span className="text-xs font-semibold text-muted">
                {currentPage} / {lastPage}
              </span>
              <button
                type="button"
                disabled={currentPage >= lastPage || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-blue-100 px-3 py-2 text-xs font-extrabold text-navy disabled:opacity-40"
              >
                {t.next}
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-blue-100/80 bg-gradient-to-br from-blue-50 to-white p-5 shadow-sm">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand shadow-sm">
              <DashboardIcon name="bell" size={22} />
            </span>
            <h3 className="mt-4 text-lg font-black text-navy">{t.notificationsStayInformed}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.notificationsStayInformedHint}</p>
            {preferencesHref && (
              <Link
                href={preferencesHref}
                className="mt-4 inline-flex items-center gap-2 font-extrabold text-brand hover:underline"
              >
                {t.notificationsManagePrefs} <DashboardIcon name="arrow" size={16} />
              </Link>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
