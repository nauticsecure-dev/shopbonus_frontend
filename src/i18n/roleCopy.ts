import { useCallback } from "react";
import { useLocale } from "./LocaleContext";
const copy = {
  "Overview": {
    "nl": "Overzicht",
    "en": "Overview"
  },
  "Orders": {
    "nl": "Bestellingen",
    "en": "Orders"
  },
  "Offers": {
    "nl": "Aanbiedingen",
    "en": "Offers"
  },
  "Notifications": {
    "nl": "Meldingen",
    "en": "Notifications"
  },
  "Support": {
    "nl": "Hulp",
    "en": "Support"
  },
  "Settings": {
    "nl": "Instellingen",
    "en": "Settings"
  },
  "Users": {
    "nl": "Gebruikers",
    "en": "Users"
  },
  "Incidents": {
    "nl": "Incidenten",
    "en": "Incidents"
  },
  "Operations": {
    "nl": "Beheer",
    "en": "Operations"
  },
  "Finance": {
    "nl": "Financieel",
    "en": "Finance"
  },
  "Content_Studio": {
    "nl": "Inhoud beheren",
    "en": "Content Studio"
  },
  "Templates": {
    "nl": "Sjablonen",
    "en": "Templates"
  },
  "Audit": {
    "nl": "Controlelogboek",
    "en": "Audit"
  },
  "Workspace": {
    "nl": "Werkomgeving",
    "en": "Workspace"
  },
  "Dashboard_navigation": {
    "nl": "Dashboardnavigatie",
    "en": "Dashboard navigation"
  },
  "Mobile_dashboard_navigation": {
    "nl": "Mobiele dashboardnavigatie",
    "en": "Mobile dashboard navigation"
  },
  "Search_webshop_voucher": {
    "nl": "Zoek webshop, voucher…",
    "en": "Search webshop, voucher…"
  },
  "Search_workspace": {
    "nl": "Zoek workspace…",
    "en": "Search workspace…"
  },
  "No_workspaces_found": {
    "nl": "Geen workspaces gevonden.",
    "en": "No workspaces found."
  },
  "New_webshop": {
    "nl": "Nieuwe webshop",
    "en": "New webshop"
  },
  "Account_menu": {
    "nl": "Accountmenu",
    "en": "Account menu"
  },
  "Close_account_menu": {
    "nl": "Accountmenu sluiten",
    "en": "Close account menu"
  },
  "Log_out": {
    "nl": "Uitloggen",
    "en": "Log out"
  },
  "Logging_out": {
    "nl": "Uitloggen…",
    "en": "Logging out…"
  },
  "Log_out_failed_Please_try_again_you_are_still_signed_in": {
    "nl": "Uitloggen mislukt. Probeer het opnieuw — je bent nog aangemeld.",
    "en": "Log out failed. Please try again — you are still signed in."
  },
  "Platform_notifications_for_Super_Admins": {
    "nl": "Platformmeldingen voor Super Admins.",
    "en": "Platform notifications for Super Admins."
  },
  "Notification_center": {
    "nl": "Meldingenbeheer",
    "en": "Notification center"
  },
  "Templates_events_reminders_and_delivery_control_for_ShopBonus": {
    "nl": "Sjablonen, gebeurtenissen, herinneringen en bezorging beheren voor ShopBonus.",
    "en": "Templates, events, reminders and delivery control for ShopBonus."
  },
  "My_inbox": {
    "nl": "Mijn inbox",
    "en": "My inbox"
  },
  "Events": {
    "nl": "Gebeurtenissen",
    "en": "Events"
  },
  "Reminders": {
    "nl": "Herinneringen",
    "en": "Reminders"
  },
  "Delivery_logs": {
    "nl": "Bezorglogboek",
    "en": "Delivery logs"
  },
  "Published_templates": {
    "nl": "Gepubliceerde sjablonen",
    "en": "Published templates"
  },
  "Draft_review": {
    "nl": "Concept / beoordeling",
    "en": "Draft / review"
  },
  "Failed_events": {
    "nl": "Mislukte gebeurtenissen",
    "en": "Failed events"
  },
  "Locale_fallbacks": {
    "nl": "Taalterugval",
    "en": "Locale fallbacks"
  },
  "Delivery_readiness": {
    "nl": "Bezorgstatus",
    "en": "Delivery readiness"
  },
  "Email_transport": {
    "nl": "E-mailbezorging:",
    "en": "Email transport:"
  },
  "available": {
    "nl": "beschikbaar",
    "en": "available"
  },
  "disabled_unavailable": {
    "nl": "uitgeschakeld / niet beschikbaar",
    "en": "disabled / unavailable"
  },
  "AI_drafts_never_publish_automatically_test_then_independent_publish": {
    "nl": ". AI-concepten worden nooit automatisch gepubliceerd — test en publiceer daarna onafhankelijk.",
    "en": ". AI drafts never publish automatically — test, then independent publish."
  },
  "Generate_with_OpenAI": {
    "nl": "Genereren met OpenAI",
    "en": "Generate with OpenAI"
  },
  "Creates_private_NL_EN_drafts_Requires_step_up_Never_auto_publishes": {
    "nl": "Maakt afgeschermde NL/EN-concepten. Vereist extra verificatie. Publiceert nooit automatisch.",
    "en": "Creates private NL/EN drafts. Requires step-up. Never auto-publishes."
  },
  "Event": {
    "nl": "Gebeurtenis",
    "en": "Event"
  },
  "Generate_NL_EN_drafts": {
    "nl": "NL/EN-concepten genereren",
    "en": "Generate NL/EN drafts"
  },
  "Template_versions": {
    "nl": "Sjabloonversies",
    "en": "Template versions"
  },
  "No_templates_yet": {
    "nl": "Nog geen templates.",
    "en": "No templates yet."
  },
  "Publish": {
    "nl": "Publiceren",
    "en": "Publish"
  },
  "Rollback": {
    "nl": "Terugzetten",
    "en": "Rollback"
  },
  "Event_catalogue": {
    "nl": "Gebeurteniscatalogus",
    "en": "Event catalogue"
  },
  "Audience": {
    "nl": "Doelgroep",
    "en": "Audience"
  },
  "required": {
    "nl": "verplicht",
    "en": "required"
  },
  "mandatory": {
    "nl": "verplicht",
    "en": "mandatory"
  },
  "optional": {
    "nl": "optioneel",
    "en": "optional"
  },
  "Failed_outbox_events": {
    "nl": "Mislukte uitgaande gebeurtenissen",
    "en": "Failed outbox events"
  },
  "No_failed_events": {
    "nl": "Geen mislukte events.",
    "en": "No failed events."
  },
  "Retry": {
    "nl": "Opnieuw proberen",
    "en": "Retry"
  },
  "Automatic_reminders": {
    "nl": "Automatische herinneringen",
    "en": "Automatic reminders"
  },
  "Driven_by_Laravel_scheduler_shopbonus_dispatch_notifications_and_published_policy": {
    "nl": "Op basis van de gepubliceerde herinneringsregels.",
    "en": "Driven by Laravel scheduler (`shopbonus:dispatch-notifications`) and published policy."
  },
  "Voucher_expiry": {
    "nl": "Vervaldatum voucher",
    "en": "Voucher expiry"
  },
  "Offer_expiry": {
    "nl": "Vervaldatum aanbieding",
    "en": "Offer expiry"
  },
  "days": {
    "nl": "— dagen",
    "en": "— days"
  },
  "Only_active_usable_vouchers": {
    "nl": ". Alleen actieve, bruikbare vouchers.",
    "en": ". Only active usable vouchers."
  },
  "days_before_active_offer_ends": {
    "nl": "dagen voordat de actieve aanbieding eindigt.",
    "en": "days before active offer ends."
  },
  "Support_replies": {
    "nl": "Antwoorden van ondersteuning",
    "en": "Support replies"
  },
  "event_driven_when_a_human_reply_is_persisted": {
    "nl": "— zodra een medewerker een antwoord heeft opgeslagen.",
    "en": "— event-driven when a human reply is persisted."
  },
  "Favorite_merchant_offers": {
    "nl": "Aanbiedingen van favoriete webshops",
    "en": "Favorite merchant offers"
  },
  "optional_preference_consent_gated": {
    "nl": "— optioneel, afhankelijk van voorkeur en toestemming.",
    "en": "— optional, preference + consent gated."
  },
  "No_deliveries": {
    "nl": "Geen deliveries.",
    "en": "No deliveries."
  },
  "Notification_policy": {
    "nl": "Meldingsbeleid",
    "en": "Notification policy"
  },
  "Saves_a_private_draft_Use_existing_platform_settings_review_publish_for_activation": {
    "nl": "Slaat een afgeschermd concept op. Activeer via beoordeling en publicatie van platforminstellingen.",
    "en": "Saves a private draft. Use existing platform-settings review/publish for activation."
  },
  "Voucher_reminder_days": {
    "nl": "Herinneringsdagen voor vouchers",
    "en": "Voucher reminder days"
  },
  "Offer_expiry_days": {
    "nl": "Dagen voor vervallen aanbieding",
    "en": "Offer expiry days"
  },
  "Retention_days": {
    "nl": "Bewaartermijn in dagen",
    "en": "Retention days"
  },
  "Reason": {
    "nl": "Reden",
    "en": "Reason"
  },
  "Save_policy_draft": {
    "nl": "Beleidsconcept opslaan",
    "en": "Save policy draft"
  },
  "Could_not_load_notification_management": {
    "nl": "Meldingenbeheer laden mislukt.",
    "en": "Could not load notification management."
  },
  "Action_failed": {
    "nl": "Actie mislukt.",
    "en": "Action failed."
  },
  "Draft_templates_generated": {
    "nl": "Conceptsjablonen gegenereerd.",
    "en": "Draft templates generated."
  },
  "Template_tested_synthetic": {
    "nl": "Sjabloon getest (synthetisch).",
    "en": "Template tested (synthetic)."
  },
  "Publish_requested_second_admin_required": {
    "nl": "Publicatie aangevraagd (tweede beheerder vereist).",
    "en": "Publish requested (second admin required)."
  },
  "Rollback_draft_created_test_and_publish_independently": {
    "nl": "Herstelconcept gemaakt — onafhankelijk testen en publiceren.",
    "en": "Rollback draft created — test and publish independently."
  },
  "Event_retry_queued": {
    "nl": "Gebeurtenis opnieuw in wachtrij geplaatst.",
    "en": "Event retry queued."
  },
  "Delivery_retry_authorized": {
    "nl": "Opnieuw bezorgen toegestaan.",
    "en": "Delivery retry authorized."
  },
  "Policy_draft_saved": {
    "nl": "Beleidsconcept opgeslagen.",
    "en": "Policy draft saved."
  },
  "Checkout_could_not_be_loaded": {
    "nl": "Checkout kon niet worden geladen.",
    "en": "Checkout could not be loaded."
  },
  "Payment_successful": {
    "nl": "Betaling geslaagd",
    "en": "Payment successful"
  },
  "Your_voucher_is_ready": {
    "nl": "Je voucher staat klaar.",
    "en": "Your voucher is ready."
  },
  "Loading_checkout": {
    "nl": "Checkout laden…",
    "en": "Loading checkout…"
  },
  "Checkout_not_found": {
    "nl": "Checkout niet gevonden",
    "en": "Checkout not found"
  },
  "Go_to_My_vouchers": {
    "nl": "Naar Mijn vouchers",
    "en": "Go to My vouchers"
  },
  "Voucher_ready": {
    "nl": "Voucher klaar",
    "en": "Voucher ready"
  },
  "Processing_payment": {
    "nl": "Betaling verwerken…",
    "en": "Processing payment…"
  },
  "Payment_received_resolution_pending": {
    "nl": "Betaling ontvangen — oplossing volgt",
    "en": "Payment received — resolution pending"
  },
  "Checkout_expired": {
    "nl": "Checkout verlopen",
    "en": "Checkout expired"
  },
  "Payment_incomplete": {
    "nl": "Betaling niet afgerond",
    "en": "Payment incomplete"
  },
  "Your_payment_is_confirmed_and_your_voucher_has_been_issued_Find_the_code_in_My_vouchers": {
    "nl": "Je betaling is bevestigd en de voucher is uitgegeven. De code vind je in Mijn vouchers.",
    "en": "Your payment is confirmed and your voucher has been issued. Find the code in My vouchers."
  },
  "We_are_waiting_for_confirmation_from_Mollie_This_page_refreshes_automatically_A_redirect_is_not_proof_of_payment": {
    "nl": "We wachten op bevestiging van Mollie. Deze pagina vernieuwt automatisch. Een redirect is geen bewijs van betaling.",
    "en": "We are waiting for confirmation from Mollie. This page refreshes automatically. A redirect is not proof of payment."
  },
  "Your_payment_succeeded_but_the_voucher_could_not_be_issued_immediately_Our_team_will_arrange_a_refund_or_compensation_You_do_not_need_to_pay_again": {
    "nl": "Je betaling is gelukt, maar de voucher kon niet meteen worden toegekend. Ons team lost dit gecontroleerd op (terugbetaling of compensatie). Je hoeft niets opnieuw te betalen.",
    "en": "Your payment succeeded, but the voucher could not be issued immediately. Our team will arrange a refund or compensation. You do not need to pay again."
  },
  "This_checkout_has_expired_No_voucher_was_issued_and_reserved_credit_has_been_released": {
    "nl": "Deze checkout is verlopen. Er is geen voucher uitgegeven en gereserveerd tegoed is vrijgegeven.",
    "en": "This checkout has expired. No voucher was issued and reserved credit has been released."
  },
  "ShopBonus_checkout": {
    "nl": "ShopBonus afrekenen",
    "en": "ShopBonus checkout"
  },
  "Reference": {
    "nl": "Referentie",
    "en": "Reference"
  },
  "Credit": {
    "nl": "Tegoed",
    "en": "Credit"
  },
  "Offer": {
    "nl": "Aanbieding",
    "en": "Offer"
  },
  "View_voucher": {
    "nl": "Bekijk voucher",
    "en": "View voucher"
  },
  "Back_to_Mollie": {
    "nl": "Terug naar Mollie",
    "en": "Back to Mollie"
  },
  "Try_again": {
    "nl": "Opnieuw proberen",
    "en": "Try again"
  },
  "My_vouchers": {
    "nl": "Mijn vouchers",
    "en": "My vouchers"
  },
  "Refresh_status": {
    "nl": "Status vernieuwen",
    "en": "Refresh status"
  },
  "approved": {
    "nl": "Goedgekeurd",
    "en": "approved"
  },
  "suspended": {
    "nl": "Opgeschort",
    "en": "suspended"
  },
  "rejected": {
    "nl": "Afgewezen",
    "en": "rejected"
  },
  "pending": {
    "nl": "In behandeling",
    "en": "pending"
  },
  "draft": {
    "nl": "Concept",
    "en": "draft"
  },
  "review": {
    "nl": "Beoordeling",
    "en": "review"
  },
  "published": {
    "nl": "Gepubliceerd",
    "en": "published"
  },
  "retired": {
    "nl": "Ingetrokken",
    "en": "retired"
  },
  "failed": {
    "nl": "Mislukt",
    "en": "failed"
  },
  "sent": {
    "nl": "Verzonden",
    "en": "sent"
  },
  "queued": {
    "nl": "In wachtrij",
    "en": "queued"
  },
  "uncertain": {
    "nl": "Onzeker",
    "en": "uncertain"
  },
  "consumers": {
    "nl": "Consumenten",
    "en": "consumers"
  },
  "merchants": {
    "nl": "Webshops",
    "en": "merchants"
  },
  "public": {
    "nl": "Publiek",
    "en": "public"
  },
  "email": {
    "nl": "E-mail",
    "en": "email"
  },
  "in_app": {
    "nl": "In de app",
    "en": "in_app"
  },
  "attempts": {
    "nl": "pogingen",
    "en": "attempts"
  },
  "unknown": {
    "nl": "onbekend",
    "en": "unknown"
  },
  "current": {
    "nl": "huidig",
    "en": "current"
  }
} as const;
export function useRoleCopy() {
 const { locale } = useLocale();
 return useCallback((key: string) => key in copy ? copy[key as keyof typeof copy][locale] : key, [locale]);
}
