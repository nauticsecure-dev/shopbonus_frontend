import type { Locale } from "@/types/locale";
import { ApiError } from "@/lib/api";

// English source labels, Dutch and German translations. Content values are never translated here.
const rows = `Page settings, media & history|Pagina-instellingen, media en geschiedenis|Seiteneinstellungen, Medien und Verlauf
sections|Secties|Abschnitte
content|Inhoud|Inhalt
media|Media|Medien
schedule|Planning|Zeitplan
history|Geschiedenis|Verlauf
Item|Onderdeel|Eintrag
Remove|Verwijderen|Entfernen
Add|Toevoegen|Hinzufügen
Move|Verplaats|Verschieben
up|omhoog|nach oben
down|omlaag|nach unten
New link|Nieuwe link|Neuer Link
New question|Nieuwe vraag|Neue Frage
Answer|Antwoord|Antwort
New platform|Nieuw platform|Neue Plattform
New benefit|Nieuw voordeel|Neuer Vorteil
Description|Beschrijving|Beschreibung
New step|Nieuwe stap|Neuer Schritt
New trust statement|Nieuwe vertrouwensverklaring|Neue Vertrauensaussage
Image slot|Afbeeldingspositie|Bildposition
Variant|Variant|Variante
Image variant|Afbeeldingsvariant|Bildvariante
Alternative text|Alternatieve tekst|Alternativtext
Replace image|Afbeelding vervangen|Bild ersetzen
Crop|Bijsnijden|Zuschneiden
Crop ratio|Beeldverhouding|Seitenverhältnis
Original|Origineel|Original
Square|Vierkant|Quadrat
Crop preview|Voorbeeld van uitsnede|Zuschnittvorschau
Horizontal focus|Horizontaal focuspunt|Horizontaler Fokus
Vertical focus|Verticaal focuspunt|Vertikaler Fokus
Horizontal crop focus|Horizontaal focuspunt van uitsnede|Horizontaler Zuschnittfokus
Vertical crop focus|Verticaal focuspunt van uitsnede|Vertikaler Zuschnittfokus
Uploading…|Uploaden…|Wird hochgeladen…
Upload cropped image|Bijgesneden afbeelding uploaden|Zugeschnittenes Bild hochladen
Choose an existing library image for this slot and variant. Changes become public only after publication.|Kies een bibliotheekafbeelding voor deze positie en variant. Wijzigingen worden pas na publicatie openbaar.|Wählen Sie ein Bibliotheksbild für diese Position und Variante. Änderungen werden erst nach Veröffentlichung sichtbar.
Previous media|Vorige media|Vorherige Medien
Next media|Volgende media|Nächste Medien
Clear variant|Variant wissen|Variante löschen
Image cropping is unavailable|Afbeeldingen bijsnijden is niet beschikbaar|Bildzuschnitt ist nicht verfügbar
Crop failed|Bijsnijden mislukt|Zuschnitt fehlgeschlagen
Upload failed|Uploaden mislukt. Probeer opnieuw.|Upload fehlgeschlagen. Bitte erneut versuchen.
Media could not be loaded|Media laden mislukt. Probeer opnieuw.|Medien konnten nicht geladen werden.
Schedule uses your local time. Schedule publication keeps the current page live until the reviewed draft is published. Further draft saves make that schedule stale. Publish applies the visibility window immediately.|De planning gebruikt je lokale tijd. De huidige pagina blijft zichtbaar tot het beoordeelde concept wordt gepubliceerd. Latere conceptwijzigingen maken de planning ongeldig. Publiceren past het zichtbaarheidsvenster direct toe.|Der Zeitplan verwendet Ihre Ortszeit. Die aktuelle Seite bleibt bis zur Veröffentlichung des geprüften Entwurfs sichtbar. Weitere Speicherungen machen den Zeitplan ungültig. Veröffentlichen wendet das Sichtbarkeitsfenster sofort an.
Schedule publication|Publicatie inplannen|Veröffentlichung planen
Pending schedules and cancellation are available in|Geplande publicaties bekijken en annuleren kan in|Geplante Veröffentlichungen verwalten und stornieren:
Content Studio|Contentstudio|Inhaltsstudio
Restoring publishes the selected earlier version immediately. Current unsaved edits will be discarded.|Herstellen publiceert de geselecteerde eerdere versie direct. Huidige niet-opgeslagen wijzigingen gaan verloren.|Wiederherstellen veröffentlicht die ausgewählte frühere Version sofort. Ungespeicherte Änderungen werden verworfen.
Published version|Gepubliceerde versie|Veröffentlichte Version
Choose a publication|Kies een publicatie|Veröffentlichung auswählen
Version|Versie|Version
Restore selected publication|Geselecteerde publicatie herstellen|Ausgewählte Veröffentlichung wiederherstellen
Publications could not be loaded|Publicaties laden mislukt. Probeer opnieuw.|Veröffentlichungen konnten nicht geladen werden.
Current draft|Huidig concept|Aktueller Entwurf
Selected publication|Geselecteerde publicatie|Ausgewählte Veröffentlichung
Field|Veld|Feld
No differences from the current draft.|Geen verschillen met het huidige concept.|Keine Unterschiede zum aktuellen Entwurf.
Comparison unavailable for this publication.|Vergelijking niet beschikbaar voor deze publicatie.|Vergleich für diese Veröffentlichung nicht verfügbar.
Compare before restoring|Vergelijken vóór herstellen|Vor Wiederherstellung vergleichen
Edit page|Pagina bewerken|Seite bearbeiten
Loading draft…|Concept laden…|Entwurf wird geladen…
Saving…|Opslaan…|Wird gespeichert…
Unsaved changes|Niet-opgeslagen wijzigingen|Ungespeicherte Änderungen
Draft saved|Concept opgeslagen|Entwurf gespeichert
Save draft|Concept opslaan|Entwurf speichern
Back to edit|Terug naar bewerken|Zurück zur Bearbeitung
Preview|Voorbeeld|Vorschau
Publish|Publiceren|Veröffentlichen
Cancel|Annuleren|Abbrechen
AI suggestion (approval required)|AI-suggestie (goedkeuring vereist)|KI-Vorschlag (Freigabe erforderlich)
Accept suggestion|Overnemen|Vorschlag übernehmen
Reject|Afwijzen|Ablehnen
Apply|Toepassen|Anwenden
Improve with AI|Verbeteren met AI|Mit KI verbessern
Close|Sluiten|Schließen
Published content could not be refreshed. Showing the last approved snapshot.|Gepubliceerde inhoud kon niet worden vernieuwd. De laatst goedgekeurde versie wordt getoond.|Veröffentlichte Inhalte konnten nicht aktualisiert werden. Die letzte freigegebene Version wird angezeigt.
CMS load failed|CMS laden mislukt|CMS konnte nicht geladen werden
CMS access is required|CMS-toegang vereist|CMS-Zugriff erforderlich
Wait until the draft has loaded|Wacht tot het concept is geladen|Warten Sie, bis der Entwurf geladen ist
Language changed during save. Reopen the editor to load this draft.|Taal gewijzigd tijdens opslaan. Open de editor opnieuw om dit concept te laden.|Sprache während des Speicherns geändert. Öffnen Sie den Editor erneut.
Save failed|Opslaan mislukt|Speichern fehlgeschlagen
Published|Gepubliceerd|Veröffentlicht
Publish failed|Publiceren mislukt|Veröffentlichung fehlgeschlagen
Publication saved. The page is outside its scheduled visibility window.|Publicatie opgeslagen. De pagina valt buiten het geplande zichtbaarheidsvenster.|Veröffentlichung gespeichert. Die Seite liegt außerhalb des geplanten Sichtbarkeitsfensters.
Select a version for this language|Selecteer een versie voor deze taal|Wählen Sie eine Version für diese Sprache
Restore failed|Herstellen mislukt|Wiederherstellung fehlgeschlagen
Language changed. Review this draft again before scheduling.|Taal gewijzigd. Controleer dit concept opnieuw voordat je het inplant.|Sprache geändert. Prüfen Sie den Entwurf vor der Planung erneut.
Publication scheduled. The current approved page stays live until the scheduled draft is published.|Publicatie ingepland. De huidige goedgekeurde pagina blijft zichtbaar tot het geplande concept wordt gepubliceerd.|Veröffentlichung geplant. Die aktuelle freigegebene Seite bleibt bis zur geplanten Veröffentlichung sichtbar.
Scheduling failed|Inplannen mislukt|Planung fehlgeschlagen
AI suggestion failed|AI-suggestie mislukt|KI-Vorschlag fehlgeschlagen
Revision conflict. Reload the editor before saving again.|Versieconflict. Heropen de editor voordat je opnieuw opslaat.|Versionskonflikt. Öffnen Sie den Editor vor dem Speichern erneut.
Validation failed. Check the entered values.|Validatie mislukt. Controleer de ingevoerde waarden.|Validierung fehlgeschlagen. Prüfen Sie Ihre Eingaben.
Your session expired. Sign in again.|Je sessie is verlopen. Log opnieuw in.|Ihre Sitzung ist abgelaufen. Melden Sie sich erneut an.
title|Titel|Titel
seo_title|SEO-titel|SEO-Titel
seo_description|SEO-beschrijving|SEO-Beschreibung
nav|Navigatie|Navigation
hero|Introductie|Einleitung
hero_background|Introductieachtergrond|Einleitungshintergrund
benefits|Voordelen|Vorteile
offers|Aanbiedingen|Angebote
offer_preview|Voorbeeld van aanbieding|Angebotsvorschau
onboarding|Aanmelding|Anmeldung
bottom_cta|Afsluitende oproep|Abschließender Aufruf
faq|Veelgestelde vragen|Häufige Fragen
footer|Voettekst|Fußzeile
platforms|Platformen|Plattformen
links|Links|Links
items|Onderdelen|Einträge
steps|Stappen|Schritte
tiles|Platformtegels|Plattformkacheln
label|Tekst|Beschriftung
href|Linkadres|Linkadresse
heading|Koptekst|Überschrift
subtitle|Ondertitel|Untertitel
eyebrow|Bovenkop|Dachzeile
description|Beschrijving|Beschreibung
question|Vraag|Frage
answer|Antwoord|Antwort
icon|Pictogram|Symbol
number|Nummer|Nummer
name|Naam|Name
platform|Platform|Plattform
trust|Vertrouwensverklaringen|Vertrauensaussagen
primary_cta|Primaire oproep|Primärer Aufruf
secondary_cta|Secundaire oproep|Sekundärer Aufruf
cta_label|Oproeptekst|Aufruftext
cta_href|Oproeplink|Aufruflink
login_label|Inlogtekst|Anmeldetext
login_href|Inloglink|Anmeldelink
logo_alt|Alternatieve logotekst|Logo-Alternativtext
artwork_note|Illustratietoelichting|Illustrationshinweis
illustrative|Illustratief|Illustrativ
publish_at|Publiceren op|Veröffentlichen am
unpublish_at|Verbergen op|Ausblenden am
alt|Alternatieve tekst|Alternativtext
desktop|Desktop|Desktop
mobile|Mobiel|Mobil
people|Mensen|Menschen
tag|Prijskaartje|Preisschild
cog|Instellingen|Einstellungen
chart|Grafiek|Diagramm
shield|Schild|Schild
spark|Vonk|Funke
document|Document|Dokument
link|Koppeling|Verknüpfung
megaphone|Megafoon|Megafon
check|Vinkje|Häkchen
shop|Winkel|Shop
section_order|Sectievolgorde|Abschnittsreihenfolge
section_visibility|Zichtbaarheid van secties|Sichtbarkeit der Abschnitte
blurb|Korte beschrijving|Kurzbeschreibung
body|Pagina-inhoud|Seiteninhalt
desktop_asset_id|Desktopafbeelding|Desktopbild
mobile_asset_id|Mobiele afbeelding|Mobilbild
seo_image_asset_id|SEO-afbeelding|SEO-Bild
background_asset_id|Achtergrondafbeelding|Hintergrundbild
illustration_asset_id|Illustratie|Illustration
image_asset_id|Afbeelding|Bild
preview_asset_id|Voorbeeldafbeelding|Vorschaubild`;
const copy = Object.fromEntries(rows.split("\n").map((row) => { const [key, ...values] = row.split("|"); return [key, values]; }));
export function merchantCmsText(locale: Locale, text: string): string {
  return locale === "en" ? text.replaceAll("_", " ") : copy[text]?.[locale === "nl" ? 0 : 1] ?? text.replaceAll("_", " ");
}
export function merchantCmsError(locale: Locale, error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 409) return merchantCmsText(locale, "Revision conflict. Reload the editor before saving again.");
    if (error.status === 422) return merchantCmsText(locale, "Validation failed. Check the entered values.");
    if ([401, 419].includes(error.status)) return merchantCmsText(locale, "Your session expired. Sign in again.");
  }
  return merchantCmsText(locale, fallback);
}
