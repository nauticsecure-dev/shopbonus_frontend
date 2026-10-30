import { env } from "@/config/env";
import type { DiscoveryWebshopCard, PageMeta } from "@/lib/discovery";

/** Server-side fetch of published directory shops (no cookies required). */
export async function fetchPublicWebshopsServer(opts: {
  sort?: string;
  per_page?: number;
  page?: number;
  search?: string;
  category?: string;
  /** Comma-separated or array of published slugs (CMS featured order). */
  slugs?: string[] | string;
} = {}): Promise<{ data: DiscoveryWebshopCard[]; meta: PageMeta | null }> {
  const params = new URLSearchParams();
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.per_page) params.set("per_page", String(opts.per_page));
  if (opts.page) params.set("page", String(opts.page));
  if (opts.search) params.set("search", opts.search);
  if (opts.category) params.set("category", opts.category);
  if (opts.slugs) {
    const list = Array.isArray(opts.slugs) ? opts.slugs.join(",") : opts.slugs;
    if (list.trim()) params.set("slugs", list);
  }
  const qs = params.toString();
  const url = `${env.apiBaseUrl.replace(/\/$/, "")}/api/v1/public/webshops${qs ? `?${qs}` : ""}`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    if (!res.ok) return { data: [], meta: null };
    const json = (await res.json()) as { data?: DiscoveryWebshopCard[]; meta?: PageMeta };
    return { data: json.data ?? [], meta: json.meta ?? null };
  } catch {
    return { data: [], meta: null };
  }
}
