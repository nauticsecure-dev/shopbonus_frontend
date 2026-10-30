"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { fetchAdminWebshops, type AdminWebshop } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

const STATUSES = ["", "pending_review", "approved", "suspended", "rejected", "draft"] as const;

function WebshopsList() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params.get("status") || "";
  const searchQ = params.get("search") || "";
  const [search, setSearch] = useState(searchQ);
  const [rows, setRows] = useState<AdminWebshop[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(searchQ);
  }, [searchQ]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchAdminWebshops({ status: status || undefined, search: searchQ || undefined })
      .then((res) => {
        if (ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setError(null);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(formatApiError(err, "Webshops laden mislukt."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [status, searchQ]);

  const applyFilters = (next: { status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    const s = next.status ?? status;
    const q = next.search ?? searchQ;
    if (s) qs.set("status", s);
    if (q) qs.set("search", q);
    router.push(`/admin/webshops${qs.toString() ? `?${qs}` : ""}`);
  };

  return (
    <AdminListPage
      title="Webshops"
      accent={status || "alle"}
      subtitle="Zoek en filter workspaces. Goedkeuren en schorsen gebeurt op de detailpagina."
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-muted">
          Status
          <select
            value={status}
            onChange={(e) => applyFilters({ status: e.target.value })}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {STATUSES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "alle"}
              </option>
            ))}
          </select>
        </label>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ search: search.trim() });
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam of eigenaar e-mail…"
            className="rounded-lg border border-blue-100 px-3 py-1.5 text-sm text-navy outline-none focus:border-brand"
          />
          <button type="submit" className="rounded-lg bg-brand px-3 py-1.5 text-sm font-extrabold text-white">
            Zoeken
          </button>
        </form>
      </div>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-muted">{total} resultaten</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-blue-50 text-xs font-bold uppercase tracking-wide text-muted">
                  <th className="py-2 pr-3">Webshop</th>
                  <th className="py-2 pr-3">Eigenaar</th>
                  <th className="py-2 pr-3">Registratie</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Integratie</th>
                  <th className="py-2 pr-3">Offers</th>
                  <th className="py-2">Actie</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-3 font-extrabold text-navy">{row.name}</td>
                    <td className="py-3 pr-3 text-muted">
                      {row.owners?.[0] ? `${row.owners[0].first_name} · ${row.owners[0].email}` : "—"}
                    </td>
                    <td className="py-3 pr-3 text-muted">
                      {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="py-3 pr-3 font-bold text-navy">{row.status}</td>
                    <td className="py-3 pr-3 text-muted">{row.integration_status ?? "—"}</td>
                    <td className="py-3 pr-3 text-muted">{row.active_offers ?? "—"}</td>
                    <td className="py-3">
                      <Link href={`/admin/webshops/${row.id}`} className="font-extrabold text-brand">
                        Openen
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="py-6 text-sm text-muted">Geen webshops gevonden.</p>}
        </>
      )}
    </AdminListPage>
  );
}

export default function AdminWebshopsPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <WebshopsList />
    </Suspense>
  );
}
