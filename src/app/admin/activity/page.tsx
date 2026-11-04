"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminPagination, { adminPage } from "@/components/AdminPagination";
import type { PageMeta } from "@/lib/adminApi";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import { type ActivityItem, activityRowKey, fetchCockpitActivity, formatActivityTime } from "@/lib/adminCockpit";

function ActivityList() {
  const params = useSearchParams();
  const page = adminPage(params.get("page"));
  const [meta, setMeta] = useState<PageMeta | null>(null);
  const webshop = params.get("webshop") || params.get("webshop_id") || undefined;
  const category = params.get("category") || undefined;
  const outcome = params.get("outcome") || undefined;
  const action = params.get("action") || undefined;
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void fetchCockpitActivity({ perPage: 50, page, webshop_id: webshop, category, outcome, action, signal: ac.signal })
        .then((res) => {
          if (!ac.signal.aborted) { setRows(res.data); setMeta(res.meta); }
        })
        .catch((err) => {
          if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Activiteit laden mislukt.");
        })
        .finally(() => {
          if (!ac.signal.aborted) setLoading(false);
        });
    }, 0);
    return () => { window.clearTimeout(timer); ac.abort(); };
  }, [page, webshop, category, outcome, action]);

  return (
    <AdminListPage title="Activiteit" accent="audit" subtitle="Platformgebeurtenissen uit de auditlog.">
      {webshop && <p className="mb-3 text-sm text-muted">Webshopfilter: {webshop}</p>}
      {loading && <p className="text-sm text-muted">Laden…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && (
        <ul className="divide-y divide-blue-50">
          {rows.map((item, index) => (
            <li key={activityRowKey(item, index)} className="py-3">
              {item.href ? (
                <Link href={item.href} className="block hover:opacity-80">
                  <p className="text-xs text-muted">{formatActivityTime(item.occurred_at)}</p>
                  <p className="font-extrabold text-navy">
                    {item.type}: {item.description}
                  </p>
                  <p className="text-xs text-muted">{item.detail}</p>
                </Link>
              ) : (
                <>
                  <p className="text-xs text-muted">{formatActivityTime(item.occurred_at)}</p>
                  <p className="font-extrabold text-navy">
                    {item.type}: {item.description}
                  </p>
                  <p className="text-xs text-muted">{item.detail}</p>
                </>
              )}
            </li>
          ))}
          {rows.length === 0 && <li className="py-6 text-sm text-muted">Geen activiteit.</li>}
        </ul>
      )}
      {!loading && !error && <AdminPagination meta={meta} />}
    </AdminListPage>
  );
}

export default function AdminActivityPage() {
  return <Suspense fallback={<p className="p-8">Laden…</p>}><ActivityList /></Suspense>;
}
