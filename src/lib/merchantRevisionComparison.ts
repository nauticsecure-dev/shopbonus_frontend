// Compare the stored, authored values, including removed fields and array order.
// Derived public asset URLs and connector availability are not revision content.
export function compareMerchantContent(current: unknown, selected: unknown, path = ""): { path: string; current: string; selected: string }[] {
  const display = (value: unknown) => value === undefined ? "—" : typeof value === "string" ? value : JSON.stringify(value);
  if (JSON.stringify(current) === JSON.stringify(selected)) return [];
  if (current && selected && typeof current === "object" && typeof selected === "object") {
    const a = current as Record<string, unknown>, b = selected as Record<string, unknown>;
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((key) => !["connectable", "blocked_reason"].includes(key) && !(key === "status" && path.startsWith("platforms.tiles."))).flatMap((key) =>
      compareMerchantContent(a[key], b[key], path ? `${path}.${key}` : key));
  }
  return [{ path, current: display(current), selected: display(selected) }];
}
