import type { Locale } from "@/types/locale";
import { merchantCmsText } from "./merchantCmsCopy";

// Reuse shared CMS labels; keep About Us-specific wording here.
const rows = `Use approved company photography. Upload creates an asset; Apply image adds it to this draft.|Gebruik goedgekeurde bedrijfsfoto’s. Uploaden maakt een mediabestand aan; Afbeelding toepassen voegt het toe aan dit concept.|Verwenden Sie freigegebene Unternehmensfotos. Hochladen erstellt eine Mediendatei; Bild anwenden fügt sie diesem Entwurf hinzu.
Image alternative text|Alternatieve tekst van afbeelding|Bildalternativtext
Apply image|Afbeelding toepassen|Bild anwenden
Clear image|Afbeelding wissen|Bild entfernen
Company details and team profiles must be verified before publication. SEO fields also control Open Graph previews.|Bedrijfsgegevens en teamprofielen moeten vóór publicatie worden gecontroleerd. SEO-velden bepalen ook de Open Graph-voorbeelden.|Unternehmensdaten und Teamprofile müssen vor der Veröffentlichung geprüft werden. SEO-Felder steuern auch die Open-Graph-Vorschau.
Times use your browser timezone. Scheduling keeps the current publication live until the reviewed draft is published. Later draft saves make that schedule stale.|Tijden gebruiken de tijdzone van je browser. De huidige publicatie blijft zichtbaar totdat het beoordeelde concept wordt gepubliceerd. Latere conceptwijzigingen maken de planning ongeldig.|Die Zeiten verwenden die Zeitzone Ihres Browsers. Die aktuelle Veröffentlichung bleibt sichtbar, bis der geprüfte Entwurf veröffentlicht wird. Späteres Speichern des Entwurfs macht den Zeitplan ungültig.
Manage or cancel pending schedules in Content Studio|Beheer of annuleer geplande publicaties in de Contentstudio|Geplante Veröffentlichungen im Inhaltsstudio verwalten oder stornieren
Select a historical publication and review its differences against the current draft. Restoration publishes immediately and discards unsaved edits.|Selecteer een eerdere publicatie en vergelijk deze met het huidige concept. Herstellen publiceert direct en verwijdert niet-opgeslagen wijzigingen.|Wählen Sie eine frühere Veröffentlichung und vergleichen Sie sie mit dem aktuellen Entwurf. Die Wiederherstellung veröffentlicht sofort und verwirft ungespeicherte Änderungen.
Version {number} compared with current draft|Versie {number} vergeleken met het huidige concept|Version {number} im Vergleich zum aktuellen Entwurf
Publish version {number} ({locale}) immediately|Versie {number} ({locale}) direct publiceren|Version {number} ({locale}) sofort veröffentlichen
No differences.|Geen verschillen.|Keine Unterschiede.
Move {field} {number} up|Verplaats {field} {number} omhoog|{field} {number} nach oben verschieben
Move {field} {number} down|Verplaats {field} {number} omlaag|{field} {number} nach unten verschieben
Move {field} up|Verplaats {field} omhoog|{field} nach oben verschieben
Move {field} down|Verplaats {field} omlaag|{field} nach unten verschieben
Show {field}|{field} tonen|{field} anzeigen
Add {field}|{field} toevoegen|{field} hinzufügen
Profile {number}: {name}|Profiel {number}: {name}|Profil {number}: {name}
New paragraph|Nieuwe alinea|Neuer Absatz
New value|Nieuwe waarde|Neuer Wert
story|Ons verhaal|Unsere Geschichte
paragraphs|Alinea’s|Absätze
values|Waarden|Werte
team|Team|Team
profiles|Profielen|Profile
contact|Contact|Kontakt
revenue_model|Verdienmodel|Geschäftsmodell
heading_accent|Kopaccent|Überschriftenakzent
float_title|Titel van zwevend blok|Titel des schwebenden Blocks
float_text|Tekst van zwevend blok|Text des schwebenden Blocks
explanation|Toelichting|Erläuterung
consumer_label|Consumentenlabel|Verbraucherbeschriftung
consumer_description|Consumentenbeschrijving|Verbraucherbeschreibung
platform_label|Platformlabel|Plattformbeschriftung
platform_description|Platformbeschrijving|Plattformbeschreibung
footnote|Voetnoot|Fußnote
introduction|Inleiding|Einführung
role|Functie|Position
bio|Biografie|Biografie
linkedin_href|LinkedIn-link|LinkedIn-Link
quote|Citaat|Zitat
show_profiles|Profielen tonen|Profile anzeigen
placeholder_label|Plaatsaanduiding|Platzhalterbeschriftung
intro|Inleiding|Einführung
legal_name|Officiële bedrijfsnaam|Offizieller Unternehmensname
address|Adres|Adresse
kvk|KvK-nummer|Handelsregisternummer
email|E-mailadres|E-Mail-Adresse
consumer_cta|Oproep voor consumenten|Aufruf für Verbraucher
merchant_cta|Oproep voor webshops|Aufruf für Shops
seo|SEO|SEO
users|Gebruikers|Benutzer`;
const copy = Object.fromEntries(rows.split("\n").map((row) => {
  const [key, ...values] = row.split("|");
  return [key, values];
}));

export function aboutUsCmsText(locale: Locale, text: string, params: Record<string, string | number> = {}): string {
  const translated = locale === "en" ? merchantCmsText(locale, text) : copy[text]?.[locale === "nl" ? 0 : 1] ?? merchantCmsText(locale, text);
  return translated.replace(/\{(\w+)\}/g, (placeholder, key: string) => String(params[key] ?? placeholder));
}
