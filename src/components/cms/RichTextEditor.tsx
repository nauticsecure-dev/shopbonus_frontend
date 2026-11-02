"use client";

import { useLocale } from "@/i18n/LocaleContext";
import type { RichDoc, RichTextNode, RichMark } from "@/lib/richText";

const inputClass = "w-full rounded-xl border border-blue-100 bg-white px-3 py-2 text-sm text-navy";
const blockTypes = ["paragraph", "heading", "bulletList", "orderedList", "image", "button"];
function createNode(type: string): RichTextNode {
  if (type === "text") return { type, text: "…" };
  if (type === "image") return { type, attrs: { asset_id: "", alt: "" } };
  if (type === "button") return { type, attrs: { label: "…", href: "/" } };
  if (type === "bulletList" || type === "orderedList") return { type, content: [createNode("listItem")] };
  return { type, ...(type === "heading" ? { attrs: { level: 2 } } : {}), content: [createNode(type === "listItem" ? "paragraph" : "text")] };
}

/** Edit individual allowlisted nodes; untouched subtrees and attributes are retained verbatim. */
export default function RichTextEditor({ value, onChange, label, rows = 3, disabled }: {
  value: RichDoc; onChange: (doc: RichDoc) => void; label?: string; rows?: number; disabled?: boolean;
}) {
  const { locale } = useLocale();
  const en = locale === "en";
  const names: Record<string, string> = en
    ? { paragraph: "Paragraph", heading: "Heading", bulletList: "Bullet list", orderedList: "Numbered list", listItem: "List item", text: "Text", image: "Image", button: "Button" }
    : { paragraph: "Alinea", heading: "Kop", bulletList: "Opsomming", orderedList: "Genummerde lijst", listItem: "Lijstitem", text: "Tekst", image: "Afbeelding", button: "Knop" };

  function editor(node: RichTextNode, update: (next: RichTextNode) => void, path: string) {
    const attrs = node.attrs ?? {};
    const attr = (key: string, name: string, maxLength?: number) => <label className="block text-xs font-bold" key={key}>{name}<input aria-label={name} className={inputClass} value={String(attrs[key] ?? "")} maxLength={maxLength} onChange={(event) => update({ ...node, attrs: { ...attrs, [key]: event.target.value } })} /></label>;
    const mark = (type: "bold" | "italic", checked: boolean) => {
      const marks: RichMark[] = (node.marks ?? []).filter((m) => m.type !== type);
      if (checked) marks.push({ type });
      update({ ...node, marks });
    };
    const children = node.content ?? [];
    return <div className="space-y-2 rounded-xl border border-blue-100 p-3" data-node-type={node.type} key={path}>
      <p className="text-xs font-extrabold text-brand">{names[node.type] ?? node.type}</p>
      {node.type === "text" && <>
        <textarea aria-label={names.text} className={inputClass} rows={Math.min(rows, 5)} maxLength={5000} value={node.text ?? ""} onChange={(event) => update({ ...node, text: event.target.value })} />
        <div className="flex gap-3">
          <label><input type="checkbox" checked={node.marks?.some((m) => m.type === "bold") ?? false} onChange={(event) => mark("bold", event.target.checked)} /> {en ? "Bold" : "Vet"}</label>
          <label><input type="checkbox" checked={node.marks?.some((m) => m.type === "italic") ?? false} onChange={(event) => mark("italic", event.target.checked)} /> {en ? "Italic" : "Cursief"}</label>
        </div>
        <label className="block text-xs font-bold">Link<input className={inputClass} aria-label="Link" value={node.marks?.find((m) => m.type === "link")?.attrs.href ?? ""} placeholder="https://… /…" onChange={(event) => {
          const marks: RichMark[] = (node.marks ?? []).filter((m) => m.type !== "link");
          if (event.target.value) marks.push({ type: "link", attrs: { href: event.target.value } });
          update({ ...node, marks });
        }} /></label>
      </>}
      {node.type === "heading" && <label>{en ? "Level" : "Niveau"}<select className={inputClass} value={Number(attrs.level)} onChange={(event) => update({ ...node, attrs: { ...attrs, level: Number(event.target.value) } })}>{[2, 3, 4].map((level) => <option key={level}>{level}</option>)}</select></label>}
      {node.type === "image" && <>{attr("asset_id", en ? "Uploaded asset ID" : "ID van geüploade afbeelding")}{attr("alt", en ? "Alternative text" : "Alternatieve tekst", 200)}</>}
      {node.type === "button" && <>{attr("label", en ? "Button label" : "Knoptekst", 40)}{attr("href", "URL")}</>}
      {!["text", "image", "button"].includes(node.type) && childEditors(children, node.type === "bulletList" || node.type === "orderedList" ? ["listItem"] : node.type === "listItem" ? ["paragraph", "bulletList", "orderedList"] : ["text"], (content) => update({ ...node, content }), path)}
    </div>;
  }
  function childEditors(nodes: RichTextNode[], allowed: string[], update: (nodes: RichTextNode[]) => void, path: string) {
    return <div className="space-y-2">
      {nodes.map((node, index) => <div key={index}>
        {editor(node, (next) => update(nodes.map((old, i) => i === index ? next : old)), `${path}.${index}`)}
        <div className="flex gap-3 text-xs text-brand">
          <button type="button" onClick={() => update(nodes.filter((_, i) => i !== index))}>{en ? "Remove" : "Verwijderen"}</button>
          {index > 0 && <button type="button" onClick={() => { const next = [...nodes]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; update(next); }}>{en ? "Move up" : "Omhoog"}</button>}
        </div>
      </div>)}
      <label className="block text-xs font-bold">{en ? "Add" : "Toevoegen"}<select aria-label={en ? "Add block" : "Blok toevoegen"} className={inputClass} value="" onChange={(event) => { if (event.target.value) update([...nodes, createNode(event.target.value)]); }}><option value="">…</option>{allowed.map((type) => <option key={type} value={type}>{names[type]}</option>)}</select></label>
    </div>;
  }
  return <fieldset disabled={disabled} className="space-y-2 disabled:opacity-60">
    {label && <legend className="text-sm font-extrabold text-navy">{label}</legend>}
    {childEditors(value.content, blockTypes, (content) => onChange({ ...value, content }), "doc")}
  </fieldset>;
}
