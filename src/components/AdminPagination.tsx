"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PageMeta } from "@/lib/adminApi";

export function adminPage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export default function AdminPagination({ meta }: { meta: PageMeta | null }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  if (!meta) return null;
  const lastPage = Math.max(1, meta.last_page);
  const navigate = (page: number) => {
    const qs = new URLSearchParams(params.toString());
    qs.set("page", String(page));
    router.push(pathname + "?" + qs);
  };
  const style = "rounded-lg border border-blue-100 px-3 py-2 text-sm font-bold text-brand disabled:opacity-40";
  return (
    <nav aria-label="Paginering" className="mt-4 flex flex-wrap items-center gap-3">
      <button type="button" className={style} disabled={meta.current_page <= 1} onClick={() => navigate(meta.current_page - 1)}>Vorige</button>
      <span className="text-sm text-muted">Pagina {meta.current_page} van {lastPage} · {meta.total} resultaten</span>
      <button type="button" className={style} disabled={meta.current_page >= lastPage} onClick={() => navigate(meta.current_page + 1)}>Volgende</button>
    </nav>
  );
}
