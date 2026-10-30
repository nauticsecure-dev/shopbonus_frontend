"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminListPage from "@/components/AdminListPage";
import { ApiError } from "@/lib/api";
import { type ActivityItem, activityRowKey, fetchCockpitActivity, formatActivityTime } from "@/lib/adminCockpit";

export default function AdminActivityPage() {
  const [rows, setRows] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    void fetchCockpitActivity({ perPage: 50, signal: ac.signal })
      .then((res) => {
        if (!ac.signal.aborted) setRows(res.data);
      })
      .catch((err) => {
        if (!ac.signal.aborted) setError(err instanceof ApiError ? err.message : "Activiteit laden mislukt.");
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });
    return () => ac.abort();
  }, []);

  return (
    <AdminListPage title="Activiteit" accent="audit" subtitle="Platformgebeurtenissen uit de auditlog.">
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
    </AdminListPage>
  );
}
