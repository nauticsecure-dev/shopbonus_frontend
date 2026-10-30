"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "@/store/SessionContext";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError } from "@/lib/api";
import { subscribeNotifications, type NotificationInboxEvent } from "@/lib/echo";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type CentralNotification,
  type NotificationFilter,
} from "@/lib/notifications";

type Options = {
  /** When false, only maintains unread count (bell). */
  list?: boolean;
  filter?: NotificationFilter;
  page?: number;
  perPage?: number;
  enabled?: boolean;
};

export function useCentralNotifications(options: Options = {}) {
  const { session } = useSession();
  const { locale } = useLocale();
  const {
    list = false,
    filter = "all",
    page = 1,
    perPage = 20,
    enabled = true,
  } = options;

  const [items, setItems] = useState<CentralNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<CentralNotification | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userId = session?.user.id;

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (!enabled || !userId) {
        setItems([]);
        setUnreadCount(0);
        setTotal(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetchNotifications({
          filter: list ? filter : "unread",
          page: list ? page : 1,
          per_page: list ? perPage : 5,
          signal,
          locale,
        });
        if (signal?.aborted) return;
        setItems(res.data);
        setUnreadCount(res.meta.unread_count);
        setTotal(res.meta.total);
        setCurrentPage(res.meta.current_page);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Meldingen konden niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [enabled, userId, list, filter, page, perPage, locale]
  );

  const scheduleRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      void refresh();
    }, 150);
  }, [refresh]);

  useEffect(() => {
    const ac = new AbortController();
    void refresh(ac.signal);
    return () => ac.abort();
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !userId) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;

    void subscribeNotifications(userId, (event: NotificationInboxEvent, payload) => {
      if (disposed) return;
      if (event === "NotificationCreated") {
        void fetchNotifications({ filter: "unread", page: 1, per_page: 1, locale })
          .then((res) => {
            if (disposed) return;
            setUnreadCount(res.meta.unread_count);
            const newest = res.data[0];
            if (newest && (!payload.notification_id || newest.id === payload.notification_id)) {
              setToast(newest);
            }
            scheduleRefresh();
          })
          .catch(() => scheduleRefresh());
        return;
      }
      scheduleRefresh();
    }).then((fn) => {
      if (disposed) {
        fn();
        return;
      }
      unsubscribe = fn;
    });

    const onFocus = () => scheduleRefresh();
    const onOnline = () => scheduleRefresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    return () => {
      disposed = true;
      unsubscribe?.();
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
  }, [enabled, userId, locale, scheduleRefresh]);

  const markRead = useCallback(
    async (id: string) => {
      const updated = await markNotificationRead(id, locale);
      setItems((current) => current.map((n) => (n.id === id ? { ...n, ...updated } : n)));
      setUnreadCount((n) => Math.max(0, n - 1));
      return updated;
    },
    [locale]
  );

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsRead(locale);
    setItems((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    setUnreadCount(0);
    return result;
  }, [locale]);

  const dismissToast = useCallback(() => setToast(null), []);

  return {
    items,
    unreadCount,
    total,
    currentPage,
    loading,
    error,
    toast,
    dismissToast,
    refresh,
    markRead,
    markAllRead,
  };
}
