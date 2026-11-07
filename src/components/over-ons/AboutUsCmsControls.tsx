"use client";
import RecipeMediaEditor from "@/components/cms/RecipeMediaEditor";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { fetchAboutUsVersions } from "@/lib/aboutUs";
import { SECTION_KEYS } from "@/lib/aboutUsDefaults";
import { aboutUsCmsText } from "@/i18n/aboutUsCmsCopy";
import { merchantCmsError } from "@/i18n/merchantCmsCopy";
import { useLocale } from "@/i18n/LocaleContext";
import { useInlineCms } from "./AboutUsInlineCms";

const inputClass = "w-full rounded border border-blue-200 bg-white p-2 text-sm text-navy";
const templates: Record<string, unknown> = {
  "nav.links": { label: "New link", href: "/" },
  "contact.links": { label: "New link", href: "/support" },
  "story.paragraphs": "New paragraph",
  "values.items": { icon: "tag", title: "New value", description: "Description" },
  "team.profiles": { name: "", role: "", bio: "", linkedin_href: "", photo_asset_id: null },
};

function Field({ path, value }: { path: string; value: unknown }) {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (text: string, params?: Record<string, string | number>) => aboutUsCmsText(locale, text, params);
  const label = path.split(".").at(-1)!;
  const fieldLabel = path.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ");
  if (/(?:_url|_asset_id|_percent)$/.test(label)) return null;
  if (Array.isArray(value)) {
    const move = (from: number, to: number) => {
      if (to < 0 || to >= value.length) return;
      const next = [...value]; next.splice(to, 0, next.splice(from, 1)[0]); cms.updateField(path, next);
    };
    return <fieldset className="space-y-2 rounded border p-3"><legend>{fieldLabel}</legend>
      {value.map((item, i) => <div key={i} className="rounded border p-2">
        <div className="flex gap-3"><span>{t("Item")} {i + 1}</span>
          <button type="button" aria-label={t("Move {field} {number} up", { field: fieldLabel, number: i + 1 })} disabled={i === 0} onClick={() => move(i, i - 1)}>↑</button>
          <button type="button" aria-label={t("Move {field} {number} down", { field: fieldLabel, number: i + 1 })} disabled={i === value.length - 1} onClick={() => move(i, i + 1)}>↓</button>
          <button type="button" onClick={() => cms.updateField(path, value.filter((_, index) => i !== index))}>{t("Remove")}</button></div>
        <Field path={`${path}.${i}`} value={item} />
      </div>)}
      {templates[path] !== undefined && <button type="button" onClick={() => cms.updateField(path, [...value, localizeTemplate(templates[path], t)])}>{t("Add {field}", { field: t(label) })}</button>}
    </fieldset>;
  }
  if (value && typeof value === "object") return <div className="space-y-2">{Object.entries(value).map(([key, item]) => <Field key={key} path={`${path}.${key}`} value={item} />)}</div>;
  if (typeof value === "boolean") return <label className="flex gap-2"><input aria-label={fieldLabel} data-cms-field={path} type="checkbox" checked={value} onChange={(e) => cms.updateField(path, e.target.checked)} />{t(label)}</label>;
  return <label className="block text-xs font-semibold">{fieldLabel}
    {label === "icon" ? <select aria-label={fieldLabel} data-cms-field={path} className={inputClass} value={String(value)} onChange={(e) => cms.updateField(path, e.target.value)}>{["tag", "shop", "users"].map((icon) => <option key={icon} value={icon}>{t(icon)}</option>)}</select>
      : <textarea aria-label={fieldLabel} data-cms-field={path} rows={/description|bio|intro/.test(label) ? 3 : 1} className={inputClass} value={String(value ?? "")} onChange={(e) => cms.updateField(path, e.target.value)} />}
  </label>;
}

function localizeTemplate(value: unknown, t: (text: string) => string): unknown {
  if (typeof value === "string") return value.startsWith("New ") || value === "Description" ? t(value) : value;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, localizeTemplate(item, t)]));
  return value;
}

function MediaEditor() {
  const cms = useInlineCms();
  const { locale } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [slot, setSlot] = useState("hero");
  const [variant, setVariant] = useState<"desktop" | "mobile">("desktop");
  const media = cms.content.media?.[slot as "hero" | "story" | "team"] ?? { alt: "" };
  const isMedia = ["hero", "story", "team"].includes(slot);
  const path = slot === "seo" ? "seo_image_asset_id" : slot.startsWith("profile.") ? `team.profiles.${slot.split(".")[1]}.photo_asset_id` : `media.${slot}.${variant}_asset_id`;
  const urlPath = slot === "seo" ? "seo_image_url" : slot.startsWith("profile.") ? `team.profiles.${slot.split(".")[1]}.photo_url` : `media.${slot}.${variant}_url`;
  const assetId = slot === "seo" ? cms.content.seo_image_asset_id : slot.startsWith("profile.") ? cms.content.team.profiles[Number(slot.split(".")[1])]?.photo_asset_id : media[`${variant}_asset_id`];
  const pins = cms.content.media_recipes ?? {};
  return <fieldset disabled={cms.saving || cms.loading} className="space-y-3">
    <label>{t("Afbeelding", "Image", "Bild")}<select aria-label="Image slot" value={slot} onChange={event => setSlot(event.target.value)}>{["hero", "story", "team", "seo"].map(name => <option key={name} value={name}>{name}</option>)}{cms.content.team.profiles.map((profile, i) => <option key={i} value={`profile.${i}`}>{profile.name}</option>)}</select></label>
    <label>{t("Variant", "Variant", "Variante")}<select aria-label="Image variant" value={variant} onChange={event => setVariant(event.target.value as "desktop" | "mobile")}><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label>
    {isMedia && <label>{t("Alternatieve tekst", "Alternative text", "Alternativtext")}<input className={inputClass} value={media.alt} onChange={event => cms.updateField(`media.${slot}`, { ...media, alt: event.target.value })} /></label>}
    <RecipeMediaEditor key={path} breakpoint={variant} assetId={assetId} onApply={selection => {
      if (isMedia) cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: selection.id, [`${variant}_url`]: selection.url }); else { cms.updateField(path, selection.id); cms.updateField(urlPath, selection.url); }
      cms.updateField("media_recipes", { ...pins, [path]: selection.recipe });
    }} />
    <button type="button" onClick={() => { if (isMedia) cms.updateField(`media.${slot}`, { ...media, [`${variant}_asset_id`]: null, [`${variant}_url`]: null }); else { cms.updateField(path, null); cms.updateField(urlPath, null); } const next = { ...pins }; delete next[path]; cms.updateField("media_recipes", next); }}>{t("Afbeelding verwijderen", "Remove image", "Bild entfernen")}</button>
  </fieldset>;
}

function flatten(value: unknown, prefix = ""): Record<string, string> {
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).flatMap(([key, item]) => Object.entries(flatten(item, prefix ? `${prefix}.${key}` : key))));
  return /_url$|_percent$/.test(prefix) ? {} : { [prefix]: String(value ?? "") };
}

export function AboutUsCmsControls() {
  const cms = useInlineCms();
  const { locale, intlLocale } = useLocale();
  const t = (text: string, params?: Record<string, string | number>) => aboutUsCmsText(locale, text, params);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("content");
  const [versions, setVersions] = useState<Awaited<ReturnType<typeof fetchAboutUsVersions>>>([]);
  const [version, setVersion] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open || tab !== "history") return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setVersion(""); setConfirm(false); setError(""); setVersions([]); } });
    void fetchAboutUsVersions(locale).then((items) => { if (!cancelled) setVersions(items); }).catch((err) => { if (!cancelled) setError(merchantCmsError(locale, err, "Publications could not be loaded")); });
    return () => { cancelled = true; };
  }, [open, tab, locale]);
  const selected = versions.find((item) => item.id === version && item.locale === locale);
  const current = flatten(cms.content), historical = flatten(selected?.content);
  const differences = [...new Set([...Object.keys(current), ...Object.keys(historical)])].filter((key) => current[key] !== historical[key]);
  return <div className="mx-auto max-w-7xl">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{t("Page settings, media & history")}</button>
    {open && <div className="my-3 max-h-[60vh] overflow-y-auto rounded border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap gap-4">{["content", "sections", "media", "schedule", "history"].map((key) => <button key={key} type="button" aria-pressed={key === tab} onClick={() => setTab(key)}>{t(key)}</button>)}</div>
      <fieldset disabled={cms.saving || cms.loading || cms.mode === "preview"}>
        {tab === "content" && <div className="grid gap-3 md:grid-cols-2">
          <p className="md:col-span-2">{t("Company details and team profiles must be verified before publication. SEO fields also control Open Graph previews.")}</p>
          {["title", "seo_title", "seo_description", "nav", ...SECTION_KEYS, "footer"].map((key) => <details key={key} className="rounded border p-3"><summary>{t(key)}</summary><Field path={key} value={cms.content[key as keyof typeof cms.content]} /></details>)}
        </div>}
        {tab === "sections" && cms.content.section_order.map((key, i, order) => <div key={key} className="flex gap-4 border p-3">
          <label><input aria-label={t("Show {field}", { field: t(key) })} type="checkbox" checked={cms.content.section_visibility[key] !== false} onChange={(e) => cms.updateField(`section_visibility.${key}`, e.target.checked)} />{t(key)}</label>
          {[-1, 1].map((direction) => <button key={direction} type="button" aria-label={t(direction === -1 ? "Move {field} up" : "Move {field} down", { field: t(key) })} disabled={i + direction < 0 || i + direction >= order.length} onClick={() => { const next = [...order]; [next[i], next[i + direction]] = [next[i + direction], next[i]]; cms.updateField("section_order", next); }}>{direction === -1 ? "↑" : "↓"}</button>)}
        </div>)}
        {tab === "media" && <MediaEditor />}
        {tab === "schedule" && <div className="space-y-3"><p>{t("Times use your browser timezone. Scheduling keeps the current publication live until the reviewed draft is published. Later draft saves make that schedule stale.")}</p>
          {(["publish_at", "unpublish_at"] as const).map((key) => {
            const date = cms.content.schedule?.[key];
            const value = date && !Number.isNaN(Date.parse(date)) ? new Date(new Date(date).getTime() - new Date(date).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
            return <label key={key} className="block">{t(key)}<input aria-label={t(key)} type="datetime-local" value={value} onChange={(e) => cms.updateField(`schedule.${key}`, e.target.value ? new Date(e.target.value).toISOString() : null)} /></label>;
          })}
          <button type="button" disabled={!cms.content.schedule?.publish_at} onClick={() => void cms.schedulePublication(cms.content.schedule!.publish_at!)}>{t("Schedule publication")}</button>
          <a className="block underline" href="/admin/cms">{t("Manage or cancel pending schedules in Content Studio")}</a>
        </div>}
        {tab === "history" && <div className="space-y-3"><p>{t("Select a historical publication and review its differences against the current draft. Restoration publishes immediately and discards unsaved edits.")}</p>
          <select aria-label={t("Published version")} value={version} onChange={(e) => { setVersion(e.target.value); setConfirm(false); }}><option value="">{t("Choose a publication")}</option>{versions.filter((item) => item.locale === locale).map((item) => <option key={item.id} value={item.id}>{t("Version")} {item.number} · {new Date(item.published_at).toLocaleString(intlLocale)} · {item.locale}</option>)}</select>
          {selected && <><table className="w-full text-left text-xs"><caption>{t("Version {number} compared with current draft", { number: selected.number })}</caption><thead><tr><th>{t("Field")}</th><th>{t("Current draft")}</th><th>{t("Selected publication")}</th></tr></thead><tbody>{differences.map((key) => <tr key={key}><th className="p-2">{key.split(".").map((part) => /^\d+$/.test(part) ? String(Number(part) + 1) : t(part)).join(" / ")}</th><td className="p-2">{current[key] ?? "—"}</td><td className="p-2">{historical[key] ?? "—"}</td></tr>)}</tbody></table>
            {!differences.length && <p>{t("No differences.")}</p>}
            <label className="block"><input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> {t("Publish version {number} ({locale}) immediately", { number: selected.number, locale: selected.locale })}</label>
            <button type="button" disabled={!confirm} onClick={() => void cms.restoreVersion(selected.id)}>{t("Restore selected publication")}</button></>}
          {error && <p role="alert">{error}</p>}
        </div>}
      </fieldset>
    </div>}
  </div>;
}
