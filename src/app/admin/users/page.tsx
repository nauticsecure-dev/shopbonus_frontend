"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { fetchAdminUsers, type AdminUser } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

const ROLES = ["", "consumer", "merchant", "owner", "manager", "employee", "super_admin"] as const;
const STATUSES = ["", "active", "suspended", "pending"] as const;

function UsersList() {
  const params = useSearchParams();
  const router = useRouter();
  const role = params.get("role") || "";
  const status = params.get("status") || "";
  const searchQ = params.get("search") || "";
  const [search, setSearch] = useState(searchQ);
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearch(searchQ);
  }, [searchQ]);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchAdminUsers({
      role: role || undefined,
      status: status || undefined,
      search: searchQ || undefined,
      registered_from: params.get("registered_from") || undefined,
      registered_to: params.get("registered_to") || undefined,
      webshop_id: params.get("webshop") || undefined,
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setError(null);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(formatApiError(err, "Gebruikers laden mislukt."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [role, status, searchQ, params]);

  const apply = (patch: Record<string, string>) => {
    const qs = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) qs.set(k, v);
      else qs.delete(k);
    }
    router.push(`/admin/users?${qs}`);
  };

  return (
    <AdminListPage title="Gebruikers" accent={role || status || "alle"} subtitle="Consumenten, merchants en platformrollen.">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-muted">
          Rol
          <select
            value={role}
            onChange={(e) => apply({ role: e.target.value })}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {ROLES.map((r) => (
              <option key={r || "all"} value={r}>
                {r || "alle"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-muted">
          Status
          <select
            value={status}
            onChange={(e) => apply({ status: e.target.value })}
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
            apply({ search: search.trim() });
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Naam of e-mail…"
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
          <ul className="divide-y divide-blue-50">
            {rows.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-extrabold text-navy">{row.first_name || "Gebruiker"}</p>
                  <p className="text-xs text-muted">
                    {row.email} · {row.status}
                    {row.roles?.length ? ` · ${row.roles.join(", ")}` : ""}
                  </p>
                </div>
                <Link href={`/admin/users/${row.id}`} className="text-sm font-extrabold text-brand">
                  Openen
                </Link>
              </li>
            ))}
            {rows.length === 0 && <li className="py-6 text-sm text-muted">Geen gebruikers gevonden.</li>}
          </ul>
        </>
      )}
    </AdminListPage>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <UsersList />
    </Suspense>
  );
}
