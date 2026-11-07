"use client";
import RecipeMediaEditor from "@/components/cms/RecipeMediaEditor";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchMerchantLandingVersions } from "@/lib/merchantLanding";
import { merchantCmsText, merchantCmsError } from "@/i18n/merchantCmsCopy";
import { useLocale } from "@/i18n/LocaleContext";
import { merchantDraftPayload } from "@/lib/merchantLanding";
import { compareMerchantContent } from "@/lib/merchantRevisionComparison";
import { SECTION_KEYS } from "@/lib/merchantLandingDefaults";
import { useInlineCms } from "./MerchantInlineCms";

const inputClass = "w-full rounded border border-blue-200 bg-white p-2 text-sm text-navy";
const choices: Record<string, string[]> = {
  "benefits.items.icon": ["people", "tag", "cog", "chart", "shield", "spark"],
  "onboarding.steps.icon": ["document", "link", "megaphone", "check", "shop"],
};
const templates: Record<string, unknown> = {
  "nav.links": { label: "New link", href: "/" },
  "footer.links": { label: "New link", href: "/" },
  "faq.items": { question: "New question", answer: "Answer" },
  "platforms.tiles": { platform: "new_platform", name: "New platform", description: "", status: "COMING_SOON", href: "/voor-webshops/aanmelden" },
  "benefits.items": { icon: "people", title: "New benefit", description: "Description" },
  "onboarding.steps": { number: "1", title: "New step", description: "Description", icon: "shop" },
  "hero.trust": "New trust statement",
};
function localizeTemplate(value: unknown, t: (text: string) => string): unknown {
  if (typeof value === "string") return value.startsWith("New ") || ["Answer", "Description"].includes(value) ? t(value) : value;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeTemplate(item, t)]));
  return value;
}
function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string) => merchantCmsText(locale, text);
  const label = path.split(".").at(-1)!;
  const fieldLabel = t(label);
  const normalized = path.split(".").filter((part) => !/^\d+$/.test(part)).join(".");
  if (/(url|asset_id|connectable|blocked_reason|status)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => { if (to < 0 || to >= value.length) return; const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next); };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{fieldLabel}</legend>{value.map((item, i) => <div key={i} className="rounded border p-2" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", path + ":" + i)} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const [source, index] = e.dataTransfer.getData("text/plain").split(":"); if (source === path) move(Number(index), i); }}>
      <div className="flex gap-3"><span>{t("Item")} {i + 1}</span><button type="button" aria-label={t("Move") + " " + fieldLabel + " " + (i + 1) + " " + t("up")} onClick={() => move(i, i - 1)}>↑</button><button type="button" aria-label={t("Move") + " " + fieldLabel + " " + (i + 1) + " " + t("down")} onClick={() => move(i, i + 1)}>↓</button><button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => index !== i))}>{t("Remove")}</button></div>
      <Field path={path + "." + i} value={item} />
    </div>)}{templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, localizeTemplate(templates[path], t)])}>{t("Add")} {fieldLabel}</button>}</fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={path + "." + key} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{fieldLabel}</label>;
  const options = choices[normalized];
  return <label className="block text-xs font-semibold">{fieldLabel}{options ? <select aria-label={path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")} data-cms-field={path} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)}>{options.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select> : <textarea aria-label={path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")} data-cms-field={path} rows={label.includes("description") || label === "answer" ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}</label>;
}

function MediaEditor() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [slot, setSlot] = useState("hero");
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const media = cms.content.media?.[slot as "hero_background" | "hero" | "benefits" | "offers"] ?? { alt: "" };
  const path = `media.${slot}.${variant}_asset_id`;
  const assetId = media[`${variant}_asset_id`];
  const pins = cms.content.media_recipes ?? {};
  return <fieldset disabled={cms.saving || cms.loading} className="space-y-3">
    <label>{t("Afbeelding", "Image", "Bild")}<select aria-label="Image slot" value={slot} onChange={event => setSlot(event.target.value)}>{["hero_background", "hero", "benefits", "offers"].map(name => <option key={name} value={name}>{name}</option>)}</select></label>
    <label>{t("Variant", "Variant", "Variante")}<select aria-label="Image variant" value={variant} onChange={event => setVariant(event.target.value as "desktop" | "mobile")}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
    <label>{t("Alternatieve tekst", "Alternative text", "Alternativtext")}<input className={inputClass} value={media.alt} onChange={event => cms.updateField(`media.${slot}`, { ...media, alt: event.target.value })} /></label>
    <RecipeMediaEditor key={path} breakpoint={variant} assetId={assetId} onApply={selection => {
      cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: selection.id, [`${variant}_url`]: selection.url });
      cms.updateField("media_recipes", { ...pins, [path]: selection.recipe });
    }} />
    <button type="button" onClick={() => { cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: null, [`${variant}_url`]: null }); const next = { ...pins }; delete next[path]; cms.updateField("media_recipes", next); }}>{t("Afbeelding verwijderen", "Remove image", "Bild entfernen")}</button>
  </fieldset>;
}

export function MerchantCmsControls() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string) => merchantCmsText(locale, text);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("sections");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchMerchantLandingVersions>>>([]);
  const [version, setVersion] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { if (!open || tab !== "history") return; let cancelled = false; queueMicrotask(() => { if (!cancelled) { setVersion(""); setVersions([]); setError(""); } }); void fetchMerchantLandingVersions(locale, true).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(merchantCmsError(locale, err, "Publications could not be loaded")); }); return () => { cancelled = true; }; }, [locale, open, tab]);
  const selected = versions.find((item) => item.id === version && item.locale === locale);
  const differences = selected?.content ? compareMerchantContent(merchantDraftPayload(cms.content), selected.content) : [];
  return <div className="mx-auto max-w-7xl">
    <button type="button" className="min-h-11 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-navy" onClick={() => setOpen(!open)} aria-expanded={open}>{t("Page settings, media & history")} {open ? "▾" : "▴"}</button>
    {open && <div className="my-3 max-h-[65vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-3">{["sections", "content", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={tab === key} onClick={() => setTab(key)}>{t(key)}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 rounded border p-3" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", String(i))} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const from = Number(e.dataTransfer.getData("text/plain")); if (!Number.isInteger(from) || from < 0 || from >= order.length) return; const next = [...order]; next.splice(i, 0, next.splice(from, 1)[0]); cms.updateField("section_order", next); }}>
          <label><input type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField("section_visibility." + key, e.target.checked)} /> {t(key)}</label>
          <button aria-label={t("Move") + " " + t(key) + " " + t("up")} disabled={i === 0} onClick={() => { const next = [...order]; [next[i-1], next[i]] = [next[i], next[i-1]]; cms.updateField("section_order", next); }}>↑</button><button aria-label={t("Move") + " " + t(key) + " " + t("down")} disabled={i === order.length - 1} onClick={() => { const next = [...order]; [next[i+1], next[i]] = [next[i], next[i+1]]; cms.updateField("section_order", next); }}>↓</button>
        </div>)}
        {tab === "content" && <div className="grid gap-4 md:grid-cols-2">{["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => { const value = cms.content[key as keyof typeof cms.content]; return <details key={key} className="rounded border p-3"><summary>{t(key)}</summary><Field path={key} value={key === "footer" ? { ...cms.content.footer, links: cms.content.footer.links ?? [] } : key === "platforms" ? { ...cms.content.platforms, tiles: cms.content.platforms.tiles.map((tile) => ({ ...tile, description: tile.description ?? "" })) } : value} /></details>; })}</div>}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>{t("Schedule uses your local time. Schedule publication keeps the current page live until the reviewed draft is published. Further draft saves make that schedule stale. Publish applies the visibility window immediately.")}</p>{["publish_at", "unpublish_at"].map((key) => { const date = cms.content.schedule?.[key as "publish_at" | "unpublish_at"]; const value = date ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : ""; return <label key={key} className="block">{t(key)}<input aria-label={t(key)} type="datetime-local" value={value} onChange={(e) => cms.updateField("schedule." + key, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>; })}<button disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>{t("Schedule publication")}</button><p>{t("Pending schedules and cancellation are available in")} <a className="underline" href="/admin/cms">{t("Content Studio")}</a>.</p></div>}
        {tab === "history" && <div className="space-y-3"><p>{t("Restoring publishes the selected earlier version immediately. Current unsaved edits will be discarded.")}</p><select aria-label={t("Published version")} value={version} onChange={(e) => setVersion(e.target.value)}><option value="">{t("Choose a publication")}</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>{t("Version")} {item.number} · {new Date(item.published_at).toLocaleString(locale)} · {item.locale}</option>)}</select>{selected && <section aria-label={t("Compare before restoring")} className="space-y-3">
          <h3 className="font-bold">{t("Compare before restoring")}</h3>
          {!selected.content ? <p role="alert">{t("Comparison unavailable for this publication.")}</p> : differences.length === 0 ? <p>{t("No differences from the current draft.")}</p> : <div className="overflow-x-auto"><table className="w-full table-fixed border-collapse text-left text-sm">
            <thead><tr>{["Field", "Current draft", "Selected publication"].map((label) => <th key={label} className="border p-2">{t(label)}</th>)}</tr></thead>
            <tbody>{differences.map((row) => <tr key={row.path}><th className="break-words border p-2">{row.path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")}</th><td className="whitespace-pre-wrap break-words border p-2">{row.current}</td><td className="whitespace-pre-wrap break-words border p-2">{row.selected}</td></tr>)}</tbody>
          </table></div>}
        </section>}<button disabled={!selected?.content} onClick={() => selected && void cms.restoreVersion(selected.id)}>{t("Restore selected publication")}</button>{error && <p role="alert">{error}</p>}</div>}
      </fieldset>
    </div>}
  </div>;
}
