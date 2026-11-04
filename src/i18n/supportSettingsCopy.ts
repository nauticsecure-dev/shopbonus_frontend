import { useMemo } from "react";
import { useLocale } from "@/i18n/LocaleContext";

// Stable wire values and field identifiers are translated only for display.
// Entries: source key | Dutch | English | German.
const rows = `
Behavior|Gedrag|Behavior|Verhalten
Rules|Regels|Rules|Regeln
Quality|Kwaliteit|Quality|Qualität
Monitoring|Monitoring|Monitoring|Überwachung
Languages|Talen|Languages|Sprachen
English|Engels|English|Englisch
Nederlands|Nederlands|Dutch|Niederländisch
Chat enabled|Chat ingeschakeld|Chat enabled|Chat aktiviert
Default language|Standaardtaal|Default language|Standardsprache
Tone|Toon|Tone|Ton
Empathy|Empathie|Empathy|Empathie
Answer detail|Antwoorddetail|Answer detail|Antwortdetails
Target answer words|Streefwoordenaantal|Target answer words|Angestrebte Wortzahl
Max answer words|Maximaal aantal woorden|Maximum answer words|Maximale Wortzahl
Max clarification questions|Maximaal aantal verduidelijkingsvragen|Maximum clarification questions|Maximale Rückfragen
Max automatic research retries|Maximale automatische onderzoekspogingen|Maximum automatic research retries|Maximale automatische Wiederholungen
Show progress updates|Voortgang tonen|Show progress updates|Fortschritt anzeigen
Show verified badge|Verificatiebadge tonen|Show verified badge|Prüfzeichen anzeigen
Suggest relevant actions|Relevante acties voorstellen|Suggest relevant actions|Relevante Aktionen vorschlagen
Human escalation|Overdracht aan medewerker|Human escalation|Übergabe an Mitarbeitende
Model|Model|Model|Modell
Reasoning effort|Redeneerinspanning|Reasoning effort|Denkaufwand
Response verbosity|Antwoorduitvoerigheid|Response verbosity|Antwortumfang
max_output_tokens|Maximale uitvoertokens|Maximum output tokens|Maximale Ausgabetokens
tool_choice|Toolkeuze|Tool choice|Werkzeugauswahl
parallel_tool_calls|Parallelle toolaanroepen|Parallel tool calls|Parallele Werkzeugaufrufe
store|Provideropslag|Provider storage|Anbieterspeicherung
stream (internal only)|Streaming (alleen intern)|Streaming (internal only)|Streaming (nur intern)
response_deadline_ms|Antwoorddeadline (ms)|Response deadline (ms)|Antwortfrist (ms)
progress_message_delay_ms|Voortgangsvertraging (ms)|Progress message delay (ms)|Fortschrittsverzögerung (ms)
max_function_rounds|Maximale toolrondes|Maximum tool rounds|Maximale Werkzeugrunden
daily_cost_limit_eur|Dagelijkse kostenlimiet (EUR)|Daily cost limit (EUR)|Tägliche Kostengrenze (EUR)
fallback_model|Terugvalmodel|Fallback model|Ersatzmodell
timeout_seconds|Requesttime-out (seconden)|Request timeout (seconds)|Zeitlimit (Sekunden)
daily_request_limit|Dagelijkse requestlimiet|Daily request limit|Tägliches Anfragelimit
rule_code|Regelcode|Rule code|Regelcode
action|Actie|Action|Aktion
scope|Bereik|Scope|Bereich
enabled|Ingeschakeld|Enabled|Aktiviert
disabled|Uitgeschakeld|Disabled|Deaktiviert
Fixed by server policy|Vastgelegd door serverbeleid|Fixed by server policy|Durch Serverrichtlinie festgelegt
friendly_professional|Vriendelijk en professioneel|Friendly and professional|Freundlich und professionell
direct|Direct|Direct|Direkt
warm|Warm|Warm|Herzlich
minimal|Minimaal|Minimal|Minimal
balanced|Gebalanceerd|Balanced|Ausgewogen
high|Hoog|High|Hoch
medium|Gemiddeld|Medium|Mittel
low|Laag|Low|Niedrig
concise|Beknopt|Concise|Kompakt
detailed|Gedetailleerd|Detailed|Ausführlich
required|Verplicht|Required|Erforderlich
auto|Automatisch|Automatic|Automatisch
none|Geen|None|Keine
nl|Nederlands|Dutch|Niederländisch
en|Engels|English|Englisch
BLOCK|Blokkeren|Block|Blockieren
REWRITE|Herschrijven|Rewrite|Überarbeiten
ESCALATE|Overdragen|Escalate|Weiterleiten
REVIEW|Beoordelen|Review|Prüfen
ALL|Alle|All|Alle
CONSUMER|Consument|Consumer|Verbraucher
WORKSPACE|Werkruimte|Workspace|Arbeitsbereich
← Terug naar Cockpit|← Terug naar Cockpit|← Back to Cockpit|← Zurück zum Cockpit
AI Support-instellingen|AI Support-instellingen|AI Support settings|KI-Support-Einstellungen
Published version|Gepubliceerde versie|Published version|Veröffentlichte Version
Draft|Concept|Draft|Entwurf
Draft opslaan|Concept opslaan|Save draft|Entwurf speichern
Test configuration|Configuratie testen|Test configuration|Konfiguration testen
Indienen|Indienen|Submit|Einreichen
Publiceren|Publiceren|Publish|Veröffentlichen
Rollback|Terugdraaien|Roll back|Zurücksetzen
Wijzigingsreden|Wijzigingsreden|Change reason|Änderungsgrund
Update AI support policy|AI-supportbeleid bijwerken|Update AI support policy|KI-Supportrichtlinie aktualisieren
Rollback AI support policy from settings UI|AI-supportbeleid terugdraaien via instellingen|Roll back AI support policy from settings|KI-Supportrichtlinie über Einstellungen zurücksetzen
Laden mislukt.|Laden mislukt.|Loading failed.|Laden fehlgeschlagen.
Opslaan mislukt.|Opslaan mislukt.|Saving failed.|Speichern fehlgeschlagen.
Sla eerst een draft op voordat je test.|Sla eerst een concept op voordat je test.|Save a draft before testing.|Vor dem Test einen Entwurf speichern.
Test mislukt.|Test mislukt.|Test failed.|Test fehlgeschlagen.
Draft saved|Concept opgeslagen|Draft saved|Entwurf gespeichert
intent regressions passed|intent-regressies geslaagd|intent regressions passed|Intent-Regressionen bestanden
failed|mislukt|failed|fehlgeschlagen
Draft ingediend voor review.|Concept ingediend voor beoordeling.|Draft submitted for review.|Entwurf zur Prüfung eingereicht.
Indienen mislukt.|Indienen mislukt.|Submission failed.|Einreichen fehlgeschlagen.
Policy gepubliceerd.|Beleid gepubliceerd.|Policy published.|Richtlinie veröffentlicht.
Publiceren mislukt (step-up/OTP of tweede admin vereist).|Publiceren mislukt (extra verificatie/OTP of tweede beheerder vereist).|Publishing failed (step-up/OTP or a second admin required).|Veröffentlichung fehlgeschlagen (zusätzliche Prüfung/OTP oder zweiter Administrator erforderlich).
Rollback-draft aangemaakt vanaf gepubliceerde versie.|Terugzetconcept aangemaakt vanaf gepubliceerde versie.|Rollback draft created from the published version.|Entwurf aus veröffentlichter Version wiederhergestellt.
Rollback mislukt.|Terugdraaien mislukt.|Rollback failed.|Zurücksetzen fehlgeschlagen.
Monitoring unavailable.|Monitoring niet beschikbaar.|Monitoring unavailable.|Überwachung nicht verfügbar.
Advanced controls use server-owned evidence templates. Deadlines and cost limits remain bounded by deployment settings. Fallback models require current verification before publication. Fixed provider controls await separate capability proof.|Geavanceerde instellingen gebruiken serverbeheerde bewijssjablonen. Deadlines en kostenlimieten blijven begrensd door de implementatie. Terugvalmodellen vereisen actuele verificatie vóór publicatie. Vaste providerinstellingen wachten op afzonderlijk bewijs van ondersteuning.|Advanced controls use server-owned evidence templates. Deadlines and cost limits remain bounded by deployment settings. Fallback models require current verification before publication. Fixed provider controls await separate capability proof.|Erweiterte Einstellungen verwenden serverseitige Belegvorlagen. Fristen und Kostengrenzen bleiben durch die Bereitstellung begrenzt. Ersatzmodelle benötigen vor Veröffentlichung eine aktuelle Prüfung. Feste Anbietereinstellungen erfordern einen separaten Funktionsnachweis.
Policy restrictions worden server-side afgedwongen. Clientwijzigingen overschrijven backend-restricties nooit.|Beleidsbeperkingen worden op de server afgedwongen. Clientwijzigingen overschrijven deze nooit.|Policy restrictions are enforced on the server. Client changes never override backend restrictions.|Richtlinien werden serverseitig durchgesetzt. Clientänderungen überschreiben keine Serverbeschränkungen.
+ Regel toevoegen|+ Regel toevoegen|+ Add rule|+ Regel hinzufügen
FAQ-kennis voor AI-antwoorden wordt beheerd in Content Studio. Gepubliceerde FAQ-items worden gebruikt naast geverifieerde accountdata.|FAQ-kennis voor AI-antwoorden wordt beheerd in Content Studio. Gepubliceerde FAQ-items worden gebruikt naast geverifieerde accountdata.|Manage FAQ knowledge for AI answers in Content Studio. Published FAQ entries supplement verified account data.|FAQ-Wissen für KI-Antworten wird im Content Studio verwaltet. Veröffentlichte FAQ-Einträge ergänzen verifizierte Kontodaten.
FAQ beheren in CMS →|FAQ beheren in CMS →|Manage FAQ in CMS →|FAQ im CMS verwalten →
Versiegeschiedenis|Versiegeschiedenis|Version history|Versionsverlauf
Negatieve feedback komt in de review-wachtrij. Correcties vereisen Super Admin-goedkeuring en een regressietest.|Negatieve feedback komt in de beoordelingswachtrij. Correcties vereisen goedkeuring van een Super Admin en een regressietest.|Negative feedback enters the review queue. Corrections require Super Admin approval and a regression test.|Negatives Feedback kommt in die Prüfwarteschlange. Korrekturen erfordern Super-Admin-Freigabe und einen Regressionstest.
Open review-wachtrij →|Open beoordelingswachtrij →|Open review queue →|Prüfwarteschlange öffnen →
Inspecteren|Inspecteren|Inspect|Ansehen
Geen open reviews.|Geen open beoordelingen.|No open reviews.|Keine offenen Prüfungen.
Geen operations-data.|Geen monitoringgegevens.|No monitoring data.|Keine Überwachungsdaten.
from|Vanaf|From|Von
to|Tot|To|Bis
model|Model|Model|Modell
locale|Taal|Language|Sprache
status|Status|Status|Status
retry_used|Hernieuwde poging gebruikt|Retry used|Wiederholung verwendet
outcome|Uitkomst|Outcome|Ergebnis
consumer|Consument|Consumer|Verbraucher
workspace|Werkruimte|Workspace|Arbeitsbereich
All|Alle|All|Alle
VERIFIED|Geverifieerd|Verified|Verifiziert
PARTIALLY_VERIFIED|Gedeeltelijk geverifieerd|Partially verified|Teilweise verifiziert
NEEDS_CLARIFICATION|Verduidelijking nodig|Needs clarification|Rückfrage erforderlich
ESCALATED|Overgedragen|Escalated|Weitergeleitet
UNAVAILABLE|Niet beschikbaar|Unavailable|Nicht verfügbar
PENDING|In afwachting|Pending|Ausstehend
RESEARCHING|Onderzoeken|Researching|Recherche
VERIFYING|Verifiëren|Verifying|Prüfung
RETRYING|Opnieuw proberen|Retrying|Erneuter Versuch
CONFIRMED_ERROR|Bevestigde fout|Confirmed error|Bestätigter Fehler
ANSWER_CORRECT|Antwoord correct|Answer correct|Antwort korrekt
NEEDS_INVESTIGATION|Onderzoek nodig|Needs investigation|Untersuchung erforderlich
Sample requests|Verzoeken in steekproef|Sample requests|Stichprobenanfragen
Verified %|Geverifieerd %|Verified %|Verifiziert %
Retries|Hernieuwde pogingen|Retries|Wiederholungen
Escalations / open reviews|Overdrachten / open beoordelingen|Escalations / open reviews|Weiterleitungen / offene Prüfungen
P95 latency (ms)|P95-latentie (ms)|P95 latency (ms)|P95-Latenz (ms)
Input tokens|Invoertokens|Input tokens|Eingabetokens
Output tokens|Uitvoertokens|Output tokens|Ausgabetokens
Daily requests|Dagelijkse verzoeken|Daily requests|Tägliche Anfragen
Broadcaster|Broadcaster|Broadcaster|Broadcast-Dienst
Last broadcast dispatch attempt|Laatste broadcastverzendpoging|Last broadcast dispatch attempt|Letzter Broadcast-Sendeversuch
Broadcast failures 24u|Broadcastfouten 24u|Broadcast failures 24h|Broadcast-Fehler 24 Std.
Circuit open|Circuit geopend|Circuit open|Schutzschaltung offen
Matching requests / sample|Overeenkomende verzoeken / steekproef|Matching requests / sample|Passende Anfragen / Stichprobe
Estimated provider cost (EUR)|Geschatte providerkosten (EUR)|Estimated provider cost (EUR)|Geschätzte Anbieterkosten (EUR)
Requests with priced usage|Verzoeken met geprijsd verbruik|Requests with priced usage|Anfragen mit bepreister Nutzung
Policy version|Beleidsversie|Policy version|Richtlinienversion
yes|ja|yes|ja
no|nee|no|nein
Unavailable|Niet beschikbaar|Unavailable|Nicht verfügbar
Cost is estimated from configured EUR rates. Unpriced requests and billed costs are unavailable; failed or fallback usage may be missing.|Kosten worden geschat met ingestelde EUR-tarieven. Ongeprijsde verzoeken en gefactureerde kosten zijn onbekend; mislukt of terugvalverbruik kan ontbreken.|Cost is estimated from configured EUR rates. Unpriced requests and billed costs are unavailable; failed or fallback usage may be missing.|Kosten werden anhand konfigurierter EUR-Tarife geschätzt. Unbepreiste Anfragen und Rechnungskosten sind unbekannt; fehlgeschlagene oder Ersatzmodell-Nutzung kann fehlen.
Verify configured primary and fallback models before publishing.|Verifieer de ingestelde primaire en terugvalmodellen vóór publicatie.|Verify configured primary and fallback models before publishing.|Konfigurierte Haupt- und Ersatzmodelle vor Veröffentlichung prüfen.
Your session expired. Sign in again.|Je sessie is verlopen. Log opnieuw in.|Your session expired. Sign in again.|Ihre Sitzung ist abgelaufen. Erneut anmelden.
Administrator authorization or additional verification is required.|Beheerdersautorisatie of extra verificatie is vereist.|Administrator authorization or additional verification is required.|Administratorberechtigung oder zusätzliche Prüfung erforderlich.
Check the settings against the allowed values and limits.|Controleer de instellingen op toegestane waarden en limieten.|Check the settings against the allowed values and limits.|Einstellungen auf zulässige Werte und Grenzen prüfen.
The policy cannot be changed in its current state. Refresh and check review requirements.|Het beleid kan nu niet worden gewijzigd. Vernieuw en controleer de beoordelingsvereisten.|The policy cannot be changed in its current state. Refresh and check review requirements.|Richtlinie kann derzeit nicht geändert werden. Aktualisieren und Prüfanforderungen kontrollieren.
Too many requests. Try again shortly.|Te veel verzoeken. Probeer het straks opnieuw.|Too many requests. Try again shortly.|Zu viele Anfragen. In Kürze erneut versuchen.
Live Reverb probe|Live Reverb-controle|Live Reverb probe|Live-Reverb-Prüfung
Probe checked at|Controle uitgevoerd op|Probe checked at|Prüfung durchgeführt am
Probe round-trip latency (ms)|Rondreislatentie controle (ms)|Probe round-trip latency (ms)|Prüf-Rundlaufzeit (ms)
connected|Verbonden|Connected|Verbunden
stale|Verouderd|Stale|Veraltet
not_measured|Niet gemeten|Not measured|Nicht gemessen
not_configured|Niet ingesteld|Not configured|Nicht konfiguriert
draft|Concept|Draft|Entwurf
review|In beoordeling|In review|In Prüfung
published|Gepubliceerd|Published|Veröffentlicht
superseded|Vervangen|Superseded|Ersetzt
`;

export const supportSettingsCopy = Object.fromEntries(rows.trim().split("\n").map((row) => {
  const [key, nl, en, de] = row.split("|");
  return [key, { nl, en, de }];
}));

export function useSupportSettingsCopy() {
  const { locale } = useLocale();
  return useMemo(() => (key: string) => supportSettingsCopy[key]?.[locale] ?? key, [locale]);
}
