import { useCallback } from "react";
import { useLocale } from "./LocaleContext";
const copy = {
  "Overview": {
    "nl": "Overzicht",
    "en": "Overview",
    "de": "Übersicht"
  },
  "Orders": {
    "nl": "Bestellingen",
    "en": "Orders",
    "de": "Bestellungen"
  },
  "Offers": {
    "nl": "Aanbiedingen",
    "en": "Offers",
    "de": "Angebote"
  },
  "Notifications": {
    "nl": "Meldingen",
    "en": "Notifications",
    "de": "Benachrichtigungen"
  },
  "Support": {
    "nl": "Hulp",
    "en": "Support",
    "de": "Hilfe"
  },
  "Settings": {
    "nl": "Instellingen",
    "en": "Settings",
    "de": "Einstellungen"
  },
  "Users": {
    "nl": "Gebruikers",
    "en": "Users",
    "de": "Nutzer"
  },
  "Incidents": {
    "nl": "Incidenten",
    "en": "Incidents",
    "de": "Vorfälle"
  },
  "Operations": {
    "nl": "Beheer",
    "en": "Operations",
    "de": "Betrieb"
  },
  "Finance": {
    "nl": "Financieel",
    "en": "Finance",
    "de": "Finanzen"
  },
  "Content_Studio": {
    "nl": "Inhoud beheren",
    "en": "Content Studio",
    "de": "Content Studio"
  },
  "Templates": {
    "nl": "Sjablonen",
    "en": "Templates",
    "de": "Vorlagen"
  },
  "Audit": {
    "nl": "Controlelogboek",
    "en": "Audit",
    "de": "Audit"
  },
  "Workspace": {
    "nl": "Werkomgeving",
    "en": "Workspace",
    "de": "Arbeitsbereich"
  },
  "Dashboard_navigation": {
    "nl": "Dashboardnavigatie",
    "en": "Dashboard navigation",
    "de": "Dashboard-Navigation"
  },
  "Mobile_dashboard_navigation": {
    "nl": "Mobiele dashboardnavigatie",
    "en": "Mobile dashboard navigation",
    "de": "Mobile Dashboard-Navigation"
  },
  "Search_webshop_voucher": {
    "nl": "Zoek webshop, voucher…",
    "en": "Search webshop, voucher…",
    "de": "Onlineshop, Gutschein suchen…"
  },
  "Search_workspace": {
    "nl": "Zoek workspace…",
    "en": "Search workspace…",
    "de": "Arbeitsbereich suchen…"
  },
  "No_workspaces_found": {
    "nl": "Geen workspaces gevonden.",
    "en": "No workspaces found.",
    "de": "Keine Arbeitsbereiche gefunden."
  },
  "New_webshop": {
    "nl": "Nieuwe webshop",
    "en": "New webshop",
    "de": "Neuer Onlineshop"
  },
  "Account_menu": {
    "nl": "Accountmenu",
    "en": "Account menu",
    "de": "Kontomenü"
  },
  "Close_account_menu": {
    "nl": "Accountmenu sluiten",
    "en": "Close account menu",
    "de": "Kontomenü schließen"
  },
  "Log_out": {
    "nl": "Uitloggen",
    "en": "Log out",
    "de": "Abmelden"
  },
  "Logging_out": {
    "nl": "Uitloggen…",
    "en": "Logging out…",
    "de": "Abmeldung läuft…"
  },
  "Log_out_failed_Please_try_again_you_are_still_signed_in": {
    "nl": "Uitloggen mislukt. Probeer het opnieuw — je bent nog aangemeld.",
    "en": "Log out failed. Please try again — you are still signed in.",
    "de": "Abmeldung fehlgeschlagen. Bitte versuche es erneut — du bist weiterhin angemeldet."
  },
  "Platform_notifications_for_Super_Admins": {
    "nl": "Platformmeldingen voor Super Admins.",
    "en": "Platform notifications for Super Admins.",
    "de": "Plattformbenachrichtigungen für Super Admins."
  },
  "Notification_center": {
    "nl": "Meldingenbeheer",
    "en": "Notification center",
    "de": "Benachrichtigungszentrale"
  },
  "Templates_events_reminders_and_delivery_control_for_ShopBonus": {
    "nl": "Sjablonen, gebeurtenissen, herinneringen en bezorging beheren voor ShopBonus.",
    "en": "Templates, events, reminders and delivery control for ShopBonus.",
    "de": "Vorlagen, Ereignisse, Erinnerungen und Zustellung für ShopBonus verwalten."
  },
  "My_inbox": {
    "nl": "Mijn inbox",
    "en": "My inbox",
    "de": "Mein Posteingang"
  },
  "Events": {
    "nl": "Gebeurtenissen",
    "en": "Events",
    "de": "Ereignisse"
  },
  "Reminders": {
    "nl": "Herinneringen",
    "en": "Reminders",
    "de": "Erinnerungen"
  },
  "Delivery_logs": {
    "nl": "Bezorglogboek",
    "en": "Delivery logs",
    "de": "Zustellprotokolle"
  },
  "Published_templates": {
    "nl": "Gepubliceerde sjablonen",
    "en": "Published templates",
    "de": "Veröffentlichte Vorlagen"
  },
  "Draft_review": {
    "nl": "Concept / beoordeling",
    "en": "Draft / review",
    "de": "Entwurf / Prüfung"
  },
  "Failed_events": {
    "nl": "Mislukte gebeurtenissen",
    "en": "Failed events",
    "de": "Fehlgeschlagene Ereignisse"
  },
  "Locale_fallbacks": {
    "nl": "Taalterugval",
    "en": "Locale fallbacks",
    "de": "Ersatzsprachen"
  },
  "Delivery_readiness": {
    "nl": "Bezorgstatus",
    "en": "Delivery readiness",
    "de": "Zustellbereitschaft"
  },
  "Email_transport": {
    "nl": "E-mailbezorging:",
    "en": "Email transport:",
    "de": "E-Mail-Versand:"
  },
  "available": {
    "nl": "beschikbaar",
    "en": "available",
    "de": "verfügbar"
  },
  "disabled_unavailable": {
    "nl": "uitgeschakeld / niet beschikbaar",
    "en": "disabled / unavailable",
    "de": "deaktiviert / nicht verfügbar"
  },
  "AI_drafts_never_publish_automatically_test_then_independent_publish": {
    "nl": ". AI-concepten worden nooit automatisch gepubliceerd — test en publiceer daarna onafhankelijk.",
    "en": ". AI drafts never publish automatically — test, then independent publish.",
    "de": ". KI-Entwürfe werden niemals automatisch veröffentlicht — zuerst testen, dann unabhängig veröffentlichen."
  },
  "Generate_with_OpenAI": {
    "nl": "Genereren met OpenAI",
    "en": "Generate with OpenAI",
    "de": "Mit OpenAI erstellen"
  },
  "Creates_private_NL_EN_drafts_Requires_step_up_Never_auto_publishes": {
    "nl": "Maakt afgeschermde NL/EN-concepten. Vereist extra verificatie. Publiceert nooit automatisch.",
    "en": "Creates private NL/EN drafts. Requires step-up. Never auto-publishes.",
    "de": "Erstellt private NL/EN-Entwürfe. Erfordert erneute Verifizierung. Keine automatische Veröffentlichung."
  },
  "Event": {
    "nl": "Gebeurtenis",
    "en": "Event",
    "de": "Ereignis"
  },
  "Generate_NL_EN_drafts": {
    "nl": "NL/EN-concepten genereren",
    "en": "Generate NL/EN drafts",
    "de": "NL/EN-Entwürfe erstellen"
  },
  "Template_versions": {
    "nl": "Sjabloonversies",
    "en": "Template versions",
    "de": "Vorlagenversionen"
  },
  "No_templates_yet": {
    "nl": "Nog geen templates.",
    "en": "No templates yet.",
    "de": "Noch keine Vorlagen."
  },
  "Publish": {
    "nl": "Publiceren",
    "en": "Publish",
    "de": "Veröffentlichen"
  },
  "Rollback": {
    "nl": "Terugzetten",
    "en": "Rollback",
    "de": "Zurücksetzen"
  },
  "Event_catalogue": {
    "nl": "Gebeurteniscatalogus",
    "en": "Event catalogue",
    "de": "Ereigniskatalog"
  },
  "Audience": {
    "nl": "Doelgroep",
    "en": "Audience",
    "de": "Zielgruppe"
  },
  "required": {
    "nl": "verplicht",
    "en": "required",
    "de": "erforderlich"
  },
  "mandatory": {
    "nl": "verplicht",
    "en": "mandatory",
    "de": "verpflichtend"
  },
  "optional": {
    "nl": "optioneel",
    "en": "optional",
    "de": "optional"
  },
  "Failed_outbox_events": {
    "nl": "Mislukte uitgaande gebeurtenissen",
    "en": "Failed outbox events",
    "de": "Fehlgeschlagene ausgehende Ereignisse"
  },
  "No_failed_events": {
    "nl": "Geen mislukte events.",
    "en": "No failed events.",
    "de": "Keine fehlgeschlagenen Ereignisse."
  },
  "Retry": {
    "nl": "Opnieuw proberen",
    "en": "Retry",
    "de": "Erneut versuchen"
  },
  "Automatic_reminders": {
    "nl": "Automatische herinneringen",
    "en": "Automatic reminders",
    "de": "Automatische Erinnerungen"
  },
  "Driven_by_Laravel_scheduler_shopbonus_dispatch_notifications_and_published_policy": {
    "nl": "Op basis van de gepubliceerde herinneringsregels.",
    "en": "Driven by Laravel scheduler (`shopbonus:dispatch-notifications`) and published policy.",
    "de": "Gesteuert durch den Laravel-Scheduler (shopbonus:dispatch-notifications) und die veröffentlichte Richtlinie."
  },
  "Voucher_expiry": {
    "nl": "Vervaldatum voucher",
    "en": "Voucher expiry",
    "de": "Gutscheinablauf"
  },
  "Offer_expiry": {
    "nl": "Vervaldatum aanbieding",
    "en": "Offer expiry",
    "de": "Angebotsablauf"
  },
  "days": {
    "nl": "— dagen",
    "en": "— days",
    "de": "— Tage"
  },
  "Only_active_usable_vouchers": {
    "nl": ". Alleen actieve, bruikbare vouchers.",
    "en": ". Only active usable vouchers.",
    "de": ". Nur aktive, nutzbare Gutscheine."
  },
  "days_before_active_offer_ends": {
    "nl": "dagen voordat de actieve aanbieding eindigt.",
    "en": "days before active offer ends.",
    "de": "Tage vor Ende des aktiven Angebots."
  },
  "Support_replies": {
    "nl": "Antwoorden van ondersteuning",
    "en": "Support replies",
    "de": "Support-Antworten"
  },
  "event_driven_when_a_human_reply_is_persisted": {
    "nl": "— zodra een medewerker een antwoord heeft opgeslagen.",
    "en": "— event-driven when a human reply is persisted.",
    "de": "— ereignisgesteuert, sobald eine menschliche Antwort gespeichert wurde."
  },
  "Favorite_merchant_offers": {
    "nl": "Aanbiedingen van favoriete webshops",
    "en": "Favorite merchant offers",
    "de": "Angebote favorisierter Onlineshops"
  },
  "optional_preference_consent_gated": {
    "nl": "— optioneel, afhankelijk van voorkeur en toestemming.",
    "en": "— optional, preference + consent gated.",
    "de": "— optional, abhängig von Präferenzen und Einwilligung."
  },
  "No_deliveries": {
    "nl": "Geen deliveries.",
    "en": "No deliveries.",
    "de": "Keine Zustellungen."
  },
  "Notification_policy": {
    "nl": "Meldingsbeleid",
    "en": "Notification policy",
    "de": "Benachrichtigungsrichtlinie"
  },
  "Saves_a_private_draft_Use_existing_platform_settings_review_publish_for_activation": {
    "nl": "Slaat een afgeschermd concept op. Activeer via beoordeling en publicatie van platforminstellingen.",
    "en": "Saves a private draft. Use existing platform-settings review/publish for activation.",
    "de": "Speichert einen privaten Entwurf. Aktivierung über die bestehende Prüfung und Veröffentlichung der Plattformeinstellungen."
  },
  "Voucher_reminder_days": {
    "nl": "Herinneringsdagen voor vouchers",
    "en": "Voucher reminder days",
    "de": "Erinnerungstage für Gutscheine"
  },
  "Offer_expiry_days": {
    "nl": "Dagen voor vervallen aanbieding",
    "en": "Offer expiry days",
    "de": "Tage vor Angebotsablauf"
  },
  "Retention_days": {
    "nl": "Bewaartermijn in dagen",
    "en": "Retention days",
    "de": "Aufbewahrungsdauer in Tagen"
  },
  "Reason": {
    "nl": "Reden",
    "en": "Reason",
    "de": "Grund"
  },
  "Save_policy_draft": {
    "nl": "Beleidsconcept opslaan",
    "en": "Save policy draft",
    "de": "Richtlinienentwurf speichern"
  },
  "Could_not_load_notification_management": {
    "nl": "Meldingenbeheer laden mislukt.",
    "en": "Could not load notification management.",
    "de": "Benachrichtigungsverwaltung konnte nicht geladen werden."
  },
  "Action_failed": {
    "nl": "Actie mislukt.",
    "en": "Action failed.",
    "de": "Aktion fehlgeschlagen."
  },
  "Draft_templates_generated": {
    "nl": "Conceptsjablonen gegenereerd.",
    "en": "Draft templates generated.",
    "de": "Vorlagenentwürfe erstellt."
  },
  "Template_tested_synthetic": {
    "nl": "Sjabloon getest (synthetisch).",
    "en": "Template tested (synthetic).",
    "de": "Vorlage getestet (synthetisch)."
  },
  "Publish_requested_second_admin_required": {
    "nl": "Publicatie aangevraagd (tweede beheerder vereist).",
    "en": "Publish requested (second admin required).",
    "de": "Veröffentlichung angefordert (zweiter Admin erforderlich)."
  },
  "Rollback_draft_created_test_and_publish_independently": {
    "nl": "Herstelconcept gemaakt — onafhankelijk testen en publiceren.",
    "en": "Rollback draft created — test and publish independently.",
    "de": "Wiederherstellungsentwurf erstellt — unabhängig testen und veröffentlichen."
  },
  "Event_retry_queued": {
    "nl": "Gebeurtenis opnieuw in wachtrij geplaatst.",
    "en": "Event retry queued.",
    "de": "Erneuter Ereignisversuch eingereiht."
  },
  "Delivery_retry_authorized": {
    "nl": "Opnieuw bezorgen toegestaan.",
    "en": "Delivery retry authorized.",
    "de": "Erneute Zustellung autorisiert."
  },
  "Policy_draft_saved": {
    "nl": "Beleidsconcept opgeslagen.",
    "en": "Policy draft saved.",
    "de": "Richtlinienentwurf gespeichert."
  },
  "Checkout_could_not_be_loaded": {
    "nl": "Checkout kon niet worden geladen.",
    "en": "Checkout could not be loaded.",
    "de": "Zahlungsvorgang konnte nicht geladen werden."
  },
  "Payment_successful": {
    "nl": "Betaling geslaagd",
    "en": "Payment successful",
    "de": "Zahlung erfolgreich"
  },
  "Your_voucher_is_ready": {
    "nl": "Je voucher staat klaar.",
    "en": "Your voucher is ready.",
    "de": "Dein Gutschein ist bereit."
  },
  "Loading_checkout": {
    "nl": "Checkout laden…",
    "en": "Loading checkout…",
    "de": "Zahlungsvorgang wird geladen…"
  },
  "Checkout_not_found": {
    "nl": "Checkout niet gevonden",
    "en": "Checkout not found",
    "de": "Zahlungsvorgang nicht gefunden"
  },
  "Go_to_My_vouchers": {
    "nl": "Naar Mijn vouchers",
    "en": "Go to My vouchers",
    "de": "Zu meinen Gutscheinen"
  },
  "Voucher_ready": {
    "nl": "Voucher klaar",
    "en": "Voucher ready",
    "de": "Gutschein bereit"
  },
  "Processing_payment": {
    "nl": "Betaling verwerken…",
    "en": "Processing payment…",
    "de": "Zahlung wird verarbeitet…"
  },
  "Payment_received_resolution_pending": {
    "nl": "Betaling ontvangen — oplossing volgt",
    "en": "Payment received — resolution pending",
    "de": "Zahlung eingegangen — Klärung ausstehend"
  },
  "Checkout_expired": {
    "nl": "Checkout verlopen",
    "en": "Checkout expired",
    "de": "Zahlungsvorgang abgelaufen"
  },
  "Payment_incomplete": {
    "nl": "Betaling niet afgerond",
    "en": "Payment incomplete",
    "de": "Zahlung unvollständig"
  },
  "Your_payment_is_confirmed_and_your_voucher_has_been_issued_Find_the_code_in_My_vouchers": {
    "nl": "Je betaling is bevestigd en de voucher is uitgegeven. De code vind je in Mijn vouchers.",
    "en": "Your payment is confirmed and your voucher has been issued. Find the code in My vouchers.",
    "de": "Deine Zahlung wurde bestätigt und dein Gutschein ausgegeben. Den Code findest du unter Meine Gutscheine."
  },
  "We_are_waiting_for_confirmation_from_Mollie_This_page_refreshes_automatically_A_redirect_is_not_proof_of_payment": {
    "nl": "We wachten op bevestiging van Mollie. Deze pagina vernieuwt automatisch. Een redirect is geen bewijs van betaling.",
    "en": "We are waiting for confirmation from Mollie. This page refreshes automatically. A redirect is not proof of payment.",
    "de": "Wir warten auf die Bestätigung von Mollie. Diese Seite aktualisiert sich automatisch. Eine Weiterleitung ist kein Zahlungsnachweis."
  },
  "Your_payment_succeeded_but_the_voucher_could_not_be_issued_immediately_Our_team_will_arrange_a_refund_or_compensation_You_do_not_need_to_pay_again": {
    "nl": "Je betaling is gelukt, maar de voucher kon niet meteen worden toegekend. Ons team lost dit gecontroleerd op (terugbetaling of compensatie). Je hoeft niets opnieuw te betalen.",
    "en": "Your payment succeeded, but the voucher could not be issued immediately. Our team will arrange a refund or compensation. You do not need to pay again.",
    "de": "Deine Zahlung war erfolgreich, aber der Gutschein konnte nicht sofort ausgegeben werden. Unser Team kümmert sich um eine Erstattung oder einen Ausgleich. Du musst nicht erneut bezahlen."
  },
  "This_checkout_has_expired_No_voucher_was_issued_and_reserved_credit_has_been_released": {
    "nl": "Deze checkout is verlopen. Er is geen voucher uitgegeven en gereserveerd tegoed is vrijgegeven.",
    "en": "This checkout has expired. No voucher was issued and reserved credit has been released.",
    "de": "Dieser Zahlungsvorgang ist abgelaufen. Es wurde kein Gutschein ausgegeben und reserviertes Guthaben wurde freigegeben."
  },
  "ShopBonus_checkout": {
    "nl": "ShopBonus afrekenen",
    "en": "ShopBonus checkout",
    "de": "ShopBonus-Zahlung"
  },
  "Reference": {
    "nl": "Referentie",
    "en": "Reference",
    "de": "Referenz"
  },
  "Credit": {
    "nl": "Tegoed",
    "en": "Credit",
    "de": "Guthaben"
  },
  "Offer": {
    "nl": "Aanbieding",
    "en": "Offer",
    "de": "Angebot"
  },
  "View_voucher": {
    "nl": "Bekijk voucher",
    "en": "View voucher",
    "de": "Gutschein anzeigen"
  },
  "Back_to_Mollie": {
    "nl": "Terug naar Mollie",
    "en": "Back to Mollie",
    "de": "Zurück zu Mollie"
  },
  "Try_again": {
    "nl": "Opnieuw proberen",
    "en": "Try again",
    "de": "Erneut versuchen"
  },
  "My_vouchers": {
    "nl": "Mijn vouchers",
    "en": "My vouchers",
    "de": "Meine Gutscheine"
  },
  "Refresh_status": {
    "nl": "Status vernieuwen",
    "en": "Refresh status",
    "de": "Status aktualisieren"
  },
  "approved": {
    "nl": "Goedgekeurd",
    "en": "approved",
    "de": "genehmigt"
  },
  "suspended": {
    "nl": "Opgeschort",
    "en": "suspended",
    "de": "gesperrt"
  },
  "rejected": {
    "nl": "Afgewezen",
    "en": "rejected",
    "de": "abgelehnt"
  },
  "pending": {
    "nl": "In behandeling",
    "en": "pending",
    "de": "ausstehend"
  },
  "draft": {
    "nl": "Concept",
    "en": "draft",
    "de": "Entwurf"
  },
  "review": {
    "nl": "Beoordeling",
    "en": "review",
    "de": "Prüfung"
  },
  "published": {
    "nl": "Gepubliceerd",
    "en": "published",
    "de": "veröffentlicht"
  },
  "retired": {
    "nl": "Ingetrokken",
    "en": "retired",
    "de": "zurückgezogen"
  },
  "failed": {
    "nl": "Mislukt",
    "en": "failed",
    "de": "fehlgeschlagen"
  },
  "sent": {
    "nl": "Verzonden",
    "en": "sent",
    "de": "gesendet"
  },
  "queued": {
    "nl": "In wachtrij",
    "en": "queued",
    "de": "eingereiht"
  },
  "uncertain": {
    "nl": "Onzeker",
    "en": "uncertain",
    "de": "ungewiss"
  },
  "consumers": {
    "nl": "Consumenten",
    "en": "consumers",
    "de": "Verbraucher"
  },
  "merchants": {
    "nl": "Webshops",
    "en": "merchants",
    "de": "Händler"
  },
  "public": {
    "nl": "Publiek",
    "en": "public",
    "de": "öffentlich"
  },
  "email": {
    "nl": "E-mail",
    "en": "email",
    "de": "E-Mail"
  },
  "in_app": {
    "nl": "In de app",
    "en": "in_app",
    "de": "in der App"
  },
  "attempts": {
    "nl": "pogingen",
    "en": "attempts",
    "de": "Versuche"
  },
  "unknown": {
    "nl": "onbekend",
    "en": "unknown",
    "de": "unbekannt"
  },
  "current": {
    "nl": "huidig",
    "en": "current",
    "de": "aktuell"
  },
  "Delivery_review_note": {
    "nl": "Onderzoeksnotitie (10–500 tekens)",
    "en": "Review note (10–500 characters)",
    "de": "Prüfnotiz (10–500 Zeichen)"
  },
  "Acknowledge_duplicate_delivery": {
    "nl": "Ik begrijp dat opnieuw verzenden een dubbele e-mail kan opleveren.",
    "en": "I understand that retrying may send a duplicate email.",
    "de": "Ich verstehe, dass ein erneuter Versuch eine doppelte E-Mail senden kann."
  },
  "Delivery_resolved": {
    "nl": "Bezorging afgehandeld",
    "en": "Delivery resolved",
    "de": "Zustellung geklärt"
  },
  "Confirm_delivery_sent": {
    "nl": "Verzending bevestigd",
    "en": "Confirm sent",
    "de": "Versand bestätigen"
  },
  "Do_not_resend": {
    "nl": "Niet opnieuw verzenden",
    "en": "Do not resend",
    "de": "Nicht erneut senden"
  },
  "Notification_previous": {
    "nl": "Vorige",
    "en": "Previous",
    "de": "Zurück"
  },
  "Notification_next": {
    "nl": "Volgende",
    "en": "Next",
    "de": "Weiter"
  },
  "Notification_page": {
    "nl": "Pagina",
    "en": "Page",
    "de": "Seite"
  },
} as const;
export function useRoleCopy() {
 const { locale } = useLocale();
 return useCallback((key: string) => key in copy ? copy[key as keyof typeof copy][locale] : key, [locale]);
}
