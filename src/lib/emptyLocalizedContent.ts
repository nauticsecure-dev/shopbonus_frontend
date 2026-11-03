/** Keep the schema shape without presenting another language as approved localized copy. */
export function emptyLocalizedContent<T>(value: T): T {
  function blank(item: unknown, key = ""): unknown {
    if (key === "section_order" || key === "section_visibility") return item;
    if (Array.isArray(item)) return [];
    if (item && typeof item === "object") {
      return Object.fromEntries(Object.entries(item).map(([k, v]) => [k, blank(v, k)]));
    }
    if (typeof item === "string") return "";
    return item;
  }
  return blank(value) as T;
}
