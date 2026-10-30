"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import { fetchAdminVouchers } from "@/lib/adminCockpit";

function VouchersList() {
  const params = useSearchParams();
  const status = params.get("status") || undefined;
  const issuedOn = params.get("issued_on") || undefined;
  const id = params.get("id") || undefined;
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    void fetchAdminVouchers({ status, issued_on: issuedOn, id, signal: ac.signal })
      .then((res) => {
        if (ac.signal.aborted) return;
        setRows(res.data);
        setTotal(res.meta.total);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Vouchers laden mislukt.");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, [status, issuedOn, id]);

  return (
    <AdminListPage
      title="Vouchers"
      accent={issuedOn || status || "overzicht"}
      subtitle="Gefilterd op status of issuedatum vanuit de Cockpit."
    >
      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <>
          <p className="mb-4 text-sm text-muted">{total} resultaten</p>
          <ul className="divide-y divide-blue-50">
            {rows.map((row) => (
              <li key={String(row.id)} className="py-3">
                <p className="font-extrabold text-navy">{String(row.id)}</p>
                <p className="text-xs text-muted">
                  {String(row.status)}
                  {row.webshop && typeof row.webshop === "object" && row.webshop !== null && "name" in row.webshop
                    ? ` · ${String((row.webshop as { name: string }).name)}`
                    : ""}
                  {row.issued_at ? ` · ${String(row.issued_at)}` : ""}
                </p>
              </li>
            ))}
            {rows.length === 0 && <li className="py-6 text-sm text-muted">Geen vouchers gevonden.</li>}
          </ul>
        </>
      )}
    </AdminListPage>
  );
}

export default function AdminVouchersPage() {
  return (
    <Suspense fallback={<p className="p-8">Laden…</p>}>
      <VouchersList />
    </Suspense>
  );
}
