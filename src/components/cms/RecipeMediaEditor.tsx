"use client";

import { useState } from "react";
import { ApiError, apiRequest } from "@/lib/api";
import { confirmPassword } from "@/lib/profile";
import { useLocale } from "@/i18n/LocaleContext";

type Derivative = { breakpoint: string; status: string; url: string | null };
type Recipe = { id: string; version: number; derivatives: Derivative[] };
type Asset = { id: string; width: number; height: number; revision: number; original_available: boolean; active_recipe: string | null; recipes: Recipe[] };
export type MediaSelection = { id: string; recipe: string; url: string };
const root = "/api/v1/admin/cms/assets";
const input = "rounded border border-blue-200 bg-white p-2";
const sizes = { desktop: 1536, tablet: 960, mobile: 480 };
type Breakpoint = keyof typeof sizes;
export default function RecipeMediaEditor({ assetId, breakpoint = "desktop", onApply, onError }: { breakpoint?: Breakpoint; assetId?: string | null; onApply: (selection: MediaSelection) => void; onError?: (error: unknown) => void }) {
  const { locale, dictionary } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [asset, setAsset] = useState<Asset>();
  const [library, setLibrary] = useState<{ data: { id: string; width: number; height: number }[]; next: string | null }>();
  const [chosen, setChosen] = useState("");
  const [crop, setCrop] = useState<Record<Breakpoint, { ratio: string; x: number; y: number; rotate: number }>>({ desktop: { ratio: "original", x: 50, y: 50, rotate: 0 }, tablet: { ratio: "original", x: 50, y: 50, rotate: 0 }, mobile: { ratio: "original", x: 50, y: 50, rotate: 0 } });
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    setBusy(true); setError("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : dictionary.errorGeneric); if (err instanceof ApiError && err.code === "password_confirmation_required") setPasswordRequired(true); onError?.(err); } finally { setBusy(false); }
  }
  function receive(value: Asset) { setAsset(value); setChosen(value.active_recipe ?? ""); }
  const recipe = asset?.recipes.find(row => row.id === chosen);
  const ready = recipe?.derivatives.length === 3 && recipe.derivatives.every(row => row.status === "ready" && row.url);
  return <fieldset disabled={busy} className="space-y-3 rounded border p-3">
    <label className="block">{t("Origineel uploaden", "Upload original", "Original hochladen")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
      const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
      void run(async () => { const body = new FormData(); body.append("image", file); const response = await apiRequest<{ data: { media: Asset } }>({ path: root, method: "POST", locale, body }); receive(response.data.media); });
    }} /></label>
    <button type="button" className={input} onClick={() => void run(async () => { setLibrary(await apiRequest({ path: root, locale })); })}>{t("Mediabibliotheek laden", "Load media library", "Medienbibliothek laden")}</button>
    <ul>{library?.data.map(row => <li key={row.id}><button type="button" onClick={() => void run(async () => { receive((await apiRequest<{ data: Asset }>({ path: root + "/" + row.id, locale })).data); })}>{row.id} · {row.width} × {row.height}</button></li>)}</ul>
    {library?.next && <button type="button" onClick={() => void run(async () => { const response = await apiRequest<NonNullable<typeof library>>({ path: root + "?after=" + encodeURIComponent(library.next!), locale }); setLibrary({ ...response, data: [...library.data, ...response.data] }); })}>{t("Meer media", "More media", "Weitere Medien")}</button>}
    {assetId && <button type="button" className={input} onClick={() => void run(async () => { receive((await apiRequest<{ data: Asset }>({ path: root + "/" + encodeURIComponent(assetId), locale })).data); })}>{t("Huidig origineel en versies laden", "Load current original and versions", "Aktuelles Original und Versionen laden")}</button>}
    {asset && <>
      <p>{asset.width} × {asset.height} · {asset.id}</p>
      <button type="button" className={input} onClick={() => void run(async () => { const response = await apiRequest<{ data: Asset }>({ path: root + "/" + asset.id, locale }); setAsset(response.data); })}>{t("Status vernieuwen", "Refresh status", "Status aktualisieren")}</button>
      <select aria-label={t("Transformatieversie", "Transformation version", "Transformationsversion")} className={input} value={chosen} onChange={event => setChosen(event.target.value)}>{asset.recipes.map(row => <option key={row.id} value={row.id}>v{row.version}{row.id === asset.active_recipe ? " ✓" : ""}</option>)}</select>
      <div className="grid gap-3 md:grid-cols-3">{recipe?.derivatives.map(row => <div key={row.breakpoint}><p>{row.breakpoint} · {row.status}</p>{row.url && <img src={row.url} alt={t("Transformatievoorbeeld", "Transformation preview", "Transformationsvorschau")} className="max-h-48 w-full object-contain" />}</div>)}</div>
      {asset.original_available && <details><summary>{t("Bijsnijden vanaf origineel", "Crop from original", "Aus Original zuschneiden")}</summary>
        {(Object.keys(sizes) as Breakpoint[]).map(bp => <fieldset key={bp} className="space-x-2 border p-2"><legend>{bp}</legend>
          <label>{t("Verhouding", "Aspect ratio", "Seitenverhältnis")}<select className={input} value={crop[bp].ratio} onChange={event => setCrop(current => ({ ...current, [bp]: { ...current[bp], ratio: event.target.value } }))}><option value="original">{t("Origineel", "Original", "Original")}</option><option value="1">1:1</option><option value="1.7777777778">16:9</option><option value="0.8">4:5</option></select></label>
          {(["x", "y"] as const).map(axis => <label key={axis}>{axis.toUpperCase()}<input aria-label={bp + " " + axis} type="range" min={0} max={100} value={crop[bp][axis]} onChange={event => setCrop(current => ({ ...current, [bp]: { ...current[bp], [axis]: Number(event.target.value) } }))} /></label>)}
          <label>{t("Rotatie", "Rotation", "Drehung")}<select className={input} value={crop[bp].rotate} onChange={event => setCrop(current => ({ ...current, [bp]: { ...current[bp], rotate: Number(event.target.value) } }))}>{[0, 90, 180, 270].map(angle => <option key={angle} value={angle}>{angle}°</option>)}</select></label>
        </fieldset>)}
        <button type="button" className={input} onClick={() => void run(async () => {
          const breakpoints = Object.fromEntries((Object.keys(sizes) as Breakpoint[]).map(bp => {
            const value = crop[bp]; const ratio = value.ratio === "original" ? asset.width / asset.height : Number(value.ratio);
            const width = Math.max(1, Math.min(asset.width, Math.floor(asset.height * ratio))); const height = Math.max(1, Math.min(asset.height, Math.floor(width / ratio)));
            return [bp, { x: Math.round((asset.width - width) * value.x / 100), y: Math.round((asset.height - height) * value.y / 100), width, height, rotate: value.rotate, output_width: sizes[bp] }];
          }));
          receive((await apiRequest<{ data: Asset }>({ path: root + "/" + asset.id + "/recipes", method: "POST", locale, body: { revision: asset.revision, breakpoints } })).data);
        })}>{t("Nieuwe versie in wachtrij zetten", "Queue new version", "Neue Version einreihen")}</button>
      </details>}
      <button type="button" className={input} disabled={!ready || chosen === asset.active_recipe} onClick={() => void run(async () => { receive((await apiRequest<{ data: Asset }>({ path: root + "/" + asset.id + "/restore", method: "POST", locale, body: { revision: asset.revision, recipe: chosen } })).data); })}>{t("Versie exact herstellen", "Restore exact version", "Version exakt wiederherstellen")}</button>
      <button type="button" className={input} disabled={!ready} onClick={() => { const url = recipe?.derivatives.find(row => row.breakpoint === breakpoint)?.url; if (url && recipe) onApply({ id: asset.id, recipe: recipe.id, url }); }}>{t("Deze versie in concept gebruiken", "Use this version in draft", "Diese Version im Entwurf verwenden")}</button>
    </>}
    {passwordRequired && <form onSubmit={event => { event.preventDefault(); const form = event.currentTarget; const password = String(new FormData(form).get("password") ?? ""); form.reset(); void run(async () => { await confirmPassword(password, locale); setPasswordRequired(false); }); }}><input aria-label={t("Huidig wachtwoord", "Current password", "Aktuelles Passwort")} name="password" type="password" autoComplete="current-password" required /><button>{t("Bevestigen", "Confirm", "Bestätigen")}</button></form>}
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
