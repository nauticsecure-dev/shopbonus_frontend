import { apiUrl } from "@/config/env";

/** Render the saved recipe, never the asset's mutable active recipe. */
export function cmsImageUrl(content: unknown, path: string, breakpoint: "desktop" | "tablet" | "mobile", fallback?: string | null): string | null {
  if (!content || typeof content !== "object") return fallback ?? null;
  const record = content as Record<string, unknown>;
  const id = path.split(".").reduce<unknown>((value, key) => value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, record);
  if (typeof id !== "string" || !id) return fallback ?? null;
  const pins = record.media_recipes as Record<string, unknown> | undefined;
  const recipe = pins?.[path];
  return apiUrl("/api/v1/public/content-assets/" + encodeURIComponent(id) + (typeof recipe === "string" && recipe ? "/recipes/" + encodeURIComponent(recipe) + "/" + breakpoint : ""));
}
