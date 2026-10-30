"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, Panel } from "@/components/DashboardPrimitives";
import { useWorkspace } from "@/store/WorkspaceContext";
import { formatMinor } from "@/lib/money";
import { subscribeOrderSheet } from "@/lib/echo";
import {
  ApiError,
  fetchOrders,
  isVerifiedPayment,
  paymentStatusLabel,
  type OrderSheetRow,
} from "@/lib/integrations";

export default function OrdersPage() {
  const { workspaceId, revision, current } = useWorkspace();
  const [orders, setOrders] = useState<OrderSheetRow[]>([]);
  const [search, setSearch] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchOrders(
          workspaceId,
          {
            search: search.trim() || undefined,
            payment_status: paymentStatus || undefined,
            page,
            per_page: 25,
            sort: "-placed_at",
          },
          signal
        );
        if (signal?.aborted) return;
        setOrders(res.data ?? []);
        setLastPage(res.meta.last_page ?? 1);
        setTotal(res.meta.total ?? res.data?.length ?? 0);
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Orders konden niet worden geladen.");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [workspaceId, search, paymentStatus, page]
  );

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [load, revision]);

  useEffect(() => {
    if (!current?.id) return;
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void subscribeOrderSheet(current.id, () => {
      if (!disposed) void load();
    }).then((fn) => {
      if (disposed) fn();
      else {
        unsubscribe = fn;
        setLive(true);
      }
    });
    return () => {
      disposed = true;
      unsubscribe?.();
      setLive(false);
    };
  }, [current?.id, load]);

  return (
    <DashboardShell>
      <DashboardHeading
        title="Orders"
        accent="live"
        subtitle="Searchable Order Sheet with real-time updates from verified webhooks."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-xs font-extrabold text-green-700">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "bg-amber-400"}`} />
            {live ? "Live" : "HTTP refresh"}
          </span>
        }
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              <DashboardIcon name="search" size={18} />
            </span>
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Zoek op referentie of e-mail…"
              className="w-full rounded-2xl border border-blue-100 py-3 pl-10 pr-4 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/30"
            />
          </label>
          <select
            value={paymentStatus}
            onChange={(e) => {
              setPage(1);
              setPaymentStatus(e.target.value);
            }}
            className="rounded-2xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold text-navy"
          >
            <option value="">Alle betaalstatussen</option>
            <option value="paid">Paid / Verified</option>
            <option value="pending">Pending</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {error && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-blue-50 text-xs font-extrabold uppercase tracking-wide text-muted">
                <th className="px-2 py-2">Order</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Payment</th>
                <th className="px-2 py-2">Contact</th>
                <th className="px-2 py-2">Placed</th>
              </tr>
            </thead>
            <tbody>
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center font-semibold text-muted">
                    Laden…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-10 text-center font-semibold text-muted">
                    Geen orders. Koppel een webshop en ontvang een betaalde testorder.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="border-b border-blue-50/70">
                    <td className="px-2 py-2.5 font-bold text-navy">#{o.reference || o.external_order_id}</td>
                    <td className="px-2 py-2.5 font-semibold">{o.customer.first_name || "—"}</td>
                    <td className="px-2 py-2.5 font-semibold">
                      {o.amount_minor == null ? "—" : formatMinor(o.amount_minor, o.currency || "EUR")}
                    </td>
                    <td className="px-2 py-2.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-extrabold ${
                          isVerifiedPayment(o.payment_status)
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {paymentStatusLabel(o.payment_status)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-xs font-bold text-muted">
                      {o.contact_status || (o.callable ? "callable" : "not_callable")}
                    </td>
                    <td className="px-2 py-2.5 text-xs font-semibold text-muted">
                      {o.placed_at ? new Date(o.placed_at).toLocaleString("nl-NL") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-sm font-semibold text-muted">
          <span>
            {total} orders · pagina {page}/{lastPage}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-blue-100 px-3 py-1.5 disabled:opacity-40"
            >
              Vorige
            </button>
            <button
              type="button"
              disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-blue-100 px-3 py-1.5 disabled:opacity-40"
            >
              Volgende
            </button>
          </div>
        </div>
      </Panel>
    </DashboardShell>
  );
}
