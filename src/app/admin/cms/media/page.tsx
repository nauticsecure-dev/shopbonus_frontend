"use client";

import { useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import { useLocale } from "@/i18n/LocaleContext";
import { ApiError, apiRequest } from "@/lib/api";
import { confirmPassword } from "@/lib/profile";

type AssetRow = { id: string; archived: boolean; width: number; height: number };
type Asset = AssetRow & {
  url: string;
  revision: number;
  original_available: boolean;
  active_recipe: string | null;
  recipes: {
    id: string;
    version: number;
    derivatives: { breakpoint: string; status: string; url: string | null }[];
  }[];
};
type Usage = {
  source: {
    page_id: string;
    page_key: string;
    locale: string;
    version: { id: string; revision: number };
  };
  paths: string[];
};
type UsageSource = "draft" | "revision";
type UsagePage = { data: Usage[]; scan: { next: number | null } };

const root = "/api/v1/admin/cms/assets";
const button = "rounded-lg bg-mist px-3 py-2 font-semibold text-navy disabled:opacity-50";
const input = "rounded-lg border border-blue-200 bg-white px-3 py-2";
const breakpoints = { mobile: 480, tablet: 960, desktop: 1536 };
const ulid = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

export default function AdminCmsMediaPage() {
  const { locale, dictionary } = useLocale();
  const t = (nl: string, en: string, de: string) => ({ nl, en, de })[locale];
  const [list, setList] = useState<{ data: AssetRow[]; next: string | null }>();
  const [asset, setAsset] = useState<Asset>();
  const [usage, setUsage] = useState<{ source: UsageSource; data: Usage[]; next: number | null }>();
  const [replacement, setReplacement] = useState("");
  const [replacementRecipe, setReplacementRecipe] = useState("");
  const [reason, setReason] = useState("");
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") setPasswordRequired(true);
      setError(err instanceof ApiError ? err.message : dictionary.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function loadList(after?: string) {
    const result = await apiRequest<NonNullable<typeof list>>({
      path: root + "?include_archived=1" + (after ? "&after=" + encodeURIComponent(after) : ""), locale,
    });
    setList({ ...result, data: after ? [...(list?.data ?? []), ...result.data] : result.data });
  }

  async function openAsset(id: string) {
    const result = await apiRequest<{ data: Asset }>({ path: root + "/" + id, locale });
    setAsset(result.data);
    setReason("");
    setReplacement("");
    setReplacementRecipe("");
    setUsage(undefined);
  }

  async function scan(id: string, source: UsageSource, after?: number) {
    const result = await apiRequest<UsagePage>({
      path: root + "/" + id + "/usages?source=" + source + (after === undefined ? "" : "&after=" + after), locale,
    });
    setUsage({ source, next: result.scan.next, data: after === undefined ? result.data : [...(usage?.data ?? []), ...result.data] });
  }

  function updateAsset(updated: Asset) {
    setAsset(updated);
    setList((current) => current && { ...current, data: current.data.map((row) => row.id === updated.id ? updated : row) });
  }

  return (
    <AdminListPage title={t("Mediabibliotheek", "Media library", "Medienbibliothek")} accent="cms" backHref="/admin/cms">
      {error && <p role="alert" className="mb-3 text-red-700">{error}</p>}
      {notice && <p role="status" className="mb-3">{notice}</p>}
      {passwordRequired && (
        <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const password = String(new FormData(form).get("password") ?? "");
          form.reset();
          void run(async () => {
            await confirmPassword(password, locale);
            setPasswordRequired(false);
            setNotice(t("Wachtwoord bevestigd. Herhaal je actie.", "Password confirmed. Retry your action.", "Passwort bestätigt. Wiederhole die Aktion."));
          });
        }}>
          <label className="grid gap-1">{t("Huidig wachtwoord", "Current password", "Aktuelles Passwort")}
            <input className={input} name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className={button} disabled={busy}>{t("Bevestigen", "Confirm", "Bestätigen")}</button>
        </form>
      )}
      <fieldset disabled={busy} className="space-y-4">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const body = new FormData(form);
          void run(async () => {
            const result = await apiRequest<{ data: { media: Asset } }>({ path: root, method: "POST", locale, body });
            setAsset(result.data.media);
            setList(undefined);
            setUsage(undefined);
            setReason("");
            setReplacement("");
            setReplacementRecipe("");
            form.reset();
          });
        }}>
          <label className="grid gap-1">{t("Originele afbeelding", "Original image", "Originalbild")}
            <input className={input} name="image" type="file" accept="image/jpeg,image/png,image/webp" required />
          </label>
          <button className={button}>{t("Origineel uploaden", "Upload original", "Original hochladen")}</button>
        </form>
        <button type="button" className={button} onClick={() => void run(() => loadList())}>
          {list ? t("Lijst vernieuwen", "Refresh list", "Liste aktualisieren") : t("Media laden", "Load media", "Medien laden")}
        </button>
        <ul className="flex flex-wrap gap-2">
          {list?.data.map((row) => (
            <li key={row.id}>
              <button type="button" className={button} aria-pressed={asset?.id === row.id} onClick={() => void run(() => openAsset(row.id))}>
                {row.id} · {row.width} × {row.height} {row.archived && t("· Gearchiveerd", "· Archived", "· Archiviert")}
              </button>
            </li>
          ))}
        </ul>
        {list?.data.length === 0 && <p>{t("Geen media gevonden.", "No media found.", "Keine Medien gefunden.")}</p>}
        {list?.next && <button type="button" className={button} onClick={() => void run(() => loadList(list.next ?? undefined))}>{t("Meer laden", "Load more", "Mehr laden")}</button>}
        {asset && (
          <section className="space-y-4 rounded-xl border border-blue-100 p-4">
            <h2 className="font-bold">{asset.id}</h2>
            <div className="flex flex-wrap gap-3">
              <a className="underline" href={asset.url}>{t("Weergavebestand", "Display image", "Anzeigebild")}</a>
              <button type="button" className={button} onClick={() => void run(async () => {
                const result = await apiRequest<{ data: Asset }>({ path: root + "/" + asset.id, locale });
                updateAsset(result.data);
              })}>{t("Status vernieuwen", "Refresh status", "Status aktualisieren")}</button>
            </div>
            <h3 className="font-bold">{t("Transformatieversies", "Transformation versions", "Transformationsversionen")}</h3>
            <ul className="space-y-2">
              {asset.recipes.map((recipe) => (
                <li key={recipe.id} className="flex flex-wrap items-center gap-3">
                  <span>v{recipe.version} · <code>{recipe.id}</code> {asset.active_recipe === recipe.id && t("(actief)", "(active)", "(aktiv)")}</span>
                  {recipe.derivatives.map(({ breakpoint, status, url }) => url
                    ? <a key={breakpoint} href={url} className="underline">{breakpoint}</a>
                    : <span key={breakpoint}>{breakpoint} · {status}</span>)}
                  {asset.original_available && recipe.id !== asset.active_recipe && recipe.derivatives.length === 3 && recipe.derivatives.every((item) => item.status === "ready") &&
                    <button type="button" className={button} onClick={() => void run(async () => {
                      const result = await apiRequest<{ data: Asset }>({
                        path: root + "/" + asset.id + "/restore", method: "POST", locale,
                        body: { revision: asset.revision, recipe: recipe.id },
                      });
                      updateAsset(result.data);
                      setNotice(t("Transformatieversie hersteld.", "Transformation version restored.", "Transformationsversion wiederhergestellt."));
                    })}>{t("Versie exact herstellen", "Restore exact version", "Version exakt wiederherstellen")}</button>}
                </li>
              ))}
            </ul>
            {asset.original_available && !asset.archived && (
              <details key={asset.id} className="space-y-3">
                <summary>{t("Nieuwe transformatie", "New transformation", "Neue Transformation")}</summary>
                <p>{t("Gebruik pixelcoördinaten van het opgeslagen origineel.", "Use pixel coordinates from the preserved original.", "Verwende die Pixelkoordinaten des gespeicherten Originals.")}</p>
                <form className="space-y-3" onSubmit={(event) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  const transforms = Object.fromEntries(Object.keys(breakpoints).map((name) => {
                    const number = (field: string) => Number(fields.get(name + "." + field));
                    return [name, {
                      x: number("x"), y: number("y"), width: number("width"), height: number("height"),
                      output_width: number("output_width"), rotate: number("rotate"),
                    }];
                  }));
                  void run(async () => {
                    const result = await apiRequest<{ data: Asset }>({
                      path: root + "/" + asset.id + "/recipes", method: "POST", locale,
                      body: { revision: asset.revision, breakpoints: transforms },
                    });
                    updateAsset(result.data);
                    setNotice(t("Nieuwe versie aangemaakt. Vernieuw de status om de bestanden te controleren.", "New version created. Refresh its status to check the files.", "Neue Version erstellt. Aktualisiere den Status, um die Dateien zu prüfen."));
                  });
                }}>
                  {Object.entries(breakpoints).map(([name, outputWidth]) => (
                    <fieldset key={name} className="flex flex-wrap gap-2 border border-blue-100 p-2">
                      <legend>{name}</legend>
                      {[
                        { key: "x", label: "X", value: 0, min: 0, max: asset.width - 1 },
                        { key: "y", label: "Y", value: 0, min: 0, max: asset.height - 1 },
                        { key: "width", label: t("Breedte", "Width", "Breite"), value: asset.width, min: 1, max: asset.width },
                        { key: "height", label: t("Hoogte", "Height", "Höhe"), value: asset.height, min: 1, max: asset.height },
                        { key: "output_width", label: t("Uitvoerbreedte", "Output width", "Ausgabebreite"), value: outputWidth, min: 1, max: 2048 },
                      ].map(({ key, label, value, min, max }) => (
                        <label key={key} className="grid gap-1">{label}
                          <input className={input + " w-28"} name={name + "." + key} type="number" min={min} max={max} defaultValue={value} required />
                        </label>
                      ))}
                      <label className="grid gap-1">{t("Rotatie", "Rotation", "Drehung")}
                        <select className={input} name={name + ".rotate"}>
                          {[0, 90, 180, 270].map((degrees) => <option key={degrees} value={degrees}>{degrees}°</option>)}
                        </select>
                      </label>
                    </fieldset>
                  ))}
                  <button className={button}>{t("Transformatie in wachtrij zetten", "Queue transformation", "Transformation einreihen")}</button>
                </form>
              </details>
            )}
            <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                const result = await apiRequest<{ data: Asset }>({
                  path: root + "/" + asset.id, method: "PATCH", locale,
                  body: { revision: asset.revision, archived: !asset.archived, reason: reason.trim() },
                });
                updateAsset(result.data);
                setReason("");
                setNotice(result.data.archived
                  ? t("Afbeelding gearchiveerd.", "Image archived.", "Bild archiviert.")
                  : t("Afbeelding opnieuw geactiveerd.", "Image reactivated.", "Bild reaktiviert."));
              });
            }}>
              <label className="grid gap-1">{t("Reden", "Reason", "Grund")}
                <input className={input} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} required />
              </label>
              <button className={button} disabled={reason.trim().length < 3}>
                {asset.archived ? t("Opnieuw activeren", "Reactivate", "Reaktivieren") : t("Archiveren", "Archive", "Archivieren")}
              </button>
            </form>
            <h3 className="font-bold">{t("Gebruik op opgeslagen CMS-pagina's", "Usage on saved CMS pages", "Verwendung auf gespeicherten CMS-Seiten")}</h3>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={button} onClick={() => void run(() => scan(asset.id, "draft"))}>{t("Concepten zoeken", "Scan drafts", "Entwürfe durchsuchen")}</button>
              <button type="button" className={button} onClick={() => void run(() => scan(asset.id, "revision"))}>{t("Revisies zoeken", "Scan revisions", "Versionen durchsuchen")}</button>
            </div>
            {usage && (
              <div className="space-y-2">
                {usage.source === "draft" && <div className="flex flex-wrap gap-2">
                  <label className="grid gap-1">{t("ID van actieve vervangende afbeelding", "Active replacement asset ID", "ID des aktiven Ersatzbilds")}
                    <input className={input} value={replacement} onChange={(event) => setReplacement(event.target.value.trim())} />
                  </label>
                  <label className="grid gap-1">{t("ID van voltooide transformatie (optioneel)", "Ready replacement recipe ID (optional)", "ID der fertigen Ersatztransformation (optional)")}
                    <input className={input} value={replacementRecipe} onChange={(event) => setReplacementRecipe(event.target.value.trim())} />
                  </label>
                </div>}
                <ul className="space-y-2">
                  {usage.data.flatMap(({ source, paths }) => paths.map((path) => (
                    <li key={source.version.id + "/" + path} className="flex flex-wrap items-center gap-2">
                      <span>{source.page_key} · {source.locale} · v{source.version.revision} · {path}</span>
                      {usage.source === "draft" && <button type="button" className={button}
                        disabled={!ulid.test(replacement) || replacement.toUpperCase() === asset.id.toUpperCase() || (!!replacementRecipe && !ulid.test(replacementRecipe))}
                        onClick={() => void run(async () => {
                          await apiRequest({
                            path: root + "/" + asset.id + "/replace", method: "POST", locale,
                            body: {
                              replacement_asset_id: replacement,
                              recipe_id: replacementRecipe || null,
                              usages: [{ page_id: source.page_id, locale: source.locale, revision: source.version.revision, path }],
                            },
                          });
                          setUsage(undefined);
                          setNotice(t("Afbeelding vervangen in het geselecteerde conceptveld.", "Image replaced in the selected draft field.", "Bild im ausgewählten Entwurfsfeld ersetzt."));
                        })}>{t("Dit conceptveld vervangen", "Replace in this draft field", "In diesem Entwurfsfeld ersetzen")}</button>}
                    </li>
                  )))}
                </ul>
                {usage.next !== null ? <button type="button" className={button} onClick={() => void run(() => scan(asset.id, usage.source, usage.next ?? undefined))}>
                  {t("Verder zoeken", "Continue scan", "Suche fortsetzen")}
                </button> : <p>{t("Zoekactie voltooid.", "Scan complete.", "Suche abgeschlossen.")}</p>}
              </div>
            )}
          </section>
        )}
      </fieldset>
    </AdminListPage>
  );
}
