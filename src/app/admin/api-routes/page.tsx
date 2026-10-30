"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { fetchApiRoutes } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

const ACCESS = ["", "public", "guest", "authenticated", "verified", "admin", "integration"] as const;
const METHODS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function ApiRoutesBrowser() {
  const params = useSearchParams();
  const router = useRouter();
  const access = params.get("access") || "";
  const method = params.get("method") || "";
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchApiRoutes({
      access: access || undefined,
      method: method || undefined,
      per_page: 50,
      page: Number(params.get("page") || 1),
    })
      .then((res) => {
        if (ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.meta?.total ?? res.data.length);
        setError(null);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(formatApiError(err, "API routes laden mislukt."));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [access, method, params]);

  const apply = (key: string, value: string) => {
    const qs = new URLSearchParams(params.toString());
    if (value) qs.set(key, value);
    else qs.delete(key);
    qs.delete("page");
    router.push(`/admin/api-routes?${qs}`);
  };

  return (
    <AdminListPage
      title="API route registry"
      accent="rechten & scope"
      backHref="/admin/audit"
      subtitle="Elke beschermde route met access, rollen, tenant-scope en auditcategorie (OpenAPI + Laravel merge)."
    >
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="text-xs font-bold text-muted">
          Access
          <select
            value={access}
            onChange={(e) => apply("access", e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {ACCESS.map((a) => (
              <option key={a || "all"} value={a}>
                {a || "alle"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-muted">
          Method
          <select
            value={method}
            onChange={(e) => apply("method", e.target.value)}
            className="ml-2 rounded-lg border border-blue-100 px-2 py-1.5 text-sm font-bold text-navy"
          >
            {METHODS.map((m) => (
              <option key={m || "all"} value={m}>
                {m || "alle"}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <p className="mb-3 text-sm text-muted">{total} routes</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-blue-50 text-xs font-bold uppercase text-muted">
                  <th className="py-2 pr-2">Method</th>
                  <th className="py-2 pr-2">Route</th>
                  <th className="py-2 pr-2">Access</th>
                  <th className="py-2 pr-2">Roles / perms</th>
                  <th className="py-2 pr-2">Scope</th>
                  <th className="py-2">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-50">
                {rows.map((row, i) => (
                  <tr key={`${String(row.method)}-${String(row.route)}-${i}`}>
                    <td className="py-2 pr-2 font-mono font-bold">{String(row.method)}</td>
                    <td className="py-2 pr-2 font-mono text-xs">{String(row.route)}</td>
                    <td className="py-2 pr-2">{String(row.access ?? "—")}</td>
                    <td className="py-2 pr-2 text-xs text-muted">
                      {Array.isArray(row.roles) ? (row.roles as string[]).join(", ") || "—" : "—"}
                      {row.permission ? ` · ${String(row.permission)}` : ""}
                    </td>
                    <td className="py-2 pr-2 text-xs text-muted">{String(row.scope ?? "—")}</td>
                    <td className="py-2 text-xs">{String(row.audit_category ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && <p className="py-6 text-sm text-muted">Geen routes.</p>}
        </>
      )}
    </AdminListPage>
  );
}

export default function AdminApiRoutesPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <ApiRoutesBrowser />
    </Suspense>
  );
}
