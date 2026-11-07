import { apiRequest } from "@/lib/api";
import type { Locale } from "@/types/locale";
import type { RichTextNode } from "@/lib/richText";

export type SharedBlock = { id: string; key: string; revision: number };
export type SharedVersion = { id: string; block_id: string; key: string; block_revision: number; number: number; locale: Locale; node: RichTextNode; sha256: string };
export type SharedUsage = { source: { page_id: string; page_key: string; locale: Locale; version: { id: string; revision: number } }; usages: { path: string }[] };
const root = "/api/v1/admin/cms";
export const listSharedBlocks = (locale: Locale, after?: string) => apiRequest<{ data: SharedBlock[]; next: string | null }>({ path: root + "/shared-blocks" + (after ? "?after=" + encodeURIComponent(after) : ""), locale });
export const getSharedBlock = (id: string, locale: Locale, after?: number) => apiRequest<{ data: SharedBlock & { versions: SharedVersion[] }; next: number | null }>({ path: root + "/shared-blocks/" + encodeURIComponent(id) + "?locale=" + locale + (after === undefined ? "" : "&after=" + after), locale });
export const saveSharedBlock = (block: SharedBlock | null, key: string, node: RichTextNode, locale: Locale) => apiRequest<{ data: SharedVersion }>({ path: root + "/shared-blocks" + (block ? "/" + encodeURIComponent(block.id) + "/versions" : ""), method: "POST", locale, body: { ...(block ? { revision: block.revision } : { key }), locale, node } });
export const getSharedUsages = (id: string, source: "draft" | "revision", locale: Locale, after?: number) => apiRequest<{ data: SharedUsage[]; scan: { next: number | null } }>({ path: root + "/shared-blocks/" + encodeURIComponent(id) + "/usages?source=" + source + (after === undefined ? "" : "&after=" + after), locale });
export const mountSharedBlock = (page: string, locale: Locale, revision: number, version: string | null, index: number | null, overrides: Record<string, string>) => apiRequest<{ data: { draft_revision: number } }>({ path: root + "/pages/" + encodeURIComponent(page) + "/locales/" + locale + "/shared-blocks" + (version ? "" : "/detach"), method: "POST", locale, body: { revision, index, ...(version ? { version_id: version, overrides } : {}) } });

/** Relative text paths accepted by the server's shared-block override allowlist. */
export function sharedTextFields(node: RichTextNode, path = ""): { path: string; text: string }[] {
  const fields: { path: string; text: string }[] = [];
  if (node.type === "text" && typeof node.text === "string") fields.push({ path: path + "text", text: node.text });
  if (node.type === "button" && typeof node.attrs?.label === "string") fields.push({ path: path + "attrs.label", text: node.attrs.label });
  for (const [index, child] of (node.content ?? []).entries()) fields.push(...sharedTextFields(child, path + "content." + index + "."));
  return fields;
}

export function sharedPreview(node: RichTextNode, overrides: Record<string, string>): RichTextNode {
  const copy = structuredClone(node);
  for (const field of sharedTextFields(copy)) {
    if (!Object.hasOwn(overrides, field.path)) continue;
    const keys = field.path.split(".");
    let target: Record<string, unknown> = copy as unknown as Record<string, unknown>;
    for (const key of keys.slice(0, -1)) target = target[key] as Record<string, unknown>;
    target[keys[keys.length - 1]] = overrides[field.path];
  }
  return copy;
}
