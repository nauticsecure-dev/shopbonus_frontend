"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminPagination, { adminPage } from "@/components/AdminPagination";
import type { PageMeta } from "@/lib/adminApi";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import { fetchAdminVouchers } from "@/lib/adminCockpit";

function VouchersList() {
  const params = useSearchParams();
  const page = adminPage(params.get("page"));
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const webshop = params.get("webshop") || params.get("webshop_id") || undefined;
  const status = params.get("status") || undefined;
  const issuedOn = params.get("issued_on") || undefined;
  const id = params.get("id") || undefined;
  const usable = params.get("usable") || undefined;
  const from = params.get("from") || undefined;
  const to = params.get("to") || undefined;
  const acquisitionNetwork = params.get("acquisition_network") || undefined;
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchAdminVouchers({ page, webshop_id: webshop, status, issued_on: issuedOn, id, usable, from, to, acquisition_network: acquisitionNetwork, signal: ac.signal })
        .then((res) => {
          if (ac.signal.aborted) return;
          setRows(res.data);
          setMeta(res.meta ?? null);
          setTotal(res.meta.total);
        })
        .catch((err) => {
          if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Vouchers laden mislukt.");
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => { window.clearTimeout(timer); ac.abort(); };
  }, [page, webshop, status, issuedOn, id, usable, from, to, acquisitionNetwork]);

  return (
    <AdminListPage
      title="Vouchers"
      accent={issuedOn || status || "overzicht"}
      subtitle="Gefilterd op status of issuedatum vanuit de Cockpit."
    >
      {webshop && <p className="mb-3 text-sm text-muted">Webshopfilter: {webshop}</p>}
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
      {!loading && !error && <AdminPagination meta={meta} />}
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
