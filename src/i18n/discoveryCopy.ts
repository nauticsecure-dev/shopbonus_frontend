import type { Locale } from "@/types/locale";

const nl = {
  all: "Alle categorieën", home: "Wonen", fashion: "Mode", tech: "Elektronica", beauty: "Beauty",
  relevance: "Relevantie", mostOffers: "Meeste aanbiedingen", name: "Naam A–Z", newest: "Recent toegevoegd",
  voucherLoading: "Vouchers laden…", voucherUnavailable: "Vouchers niet beschikbaar",
  voucherOne: "actieve voucher", voucherMany: "actieve vouchers",
  eyebrow: "MEER WEBSHOPS. MEER VOORDEEL.", title: "Ontdek webshops en aanbiedingen.",
  introduction: "Blader door honderden webshops en profiteer van unieke kortingsvouchers via ShopBonus.",
  credit: "Mijn ShopBonus-tegoed", guestTitle: "Bekijk jouw tegoed en vouchers",
  guestHint: "Log in om je ShopBonus-saldo te zien.", login: "Inloggen",
  search: "Zoek een webshop", searchPlaceholder: "Zoek een webshop...", hasOffers: "Met actieve aanbieding", sort: "Sorteren",
  errorTitle: "Kon webshops niet laden", errorHint: "Er ging iets mis. Probeer het later opnieuw.", retry: "Opnieuw proberen",
  emptyTitle: "Geen webshops gevonden", emptyHint: "Geen webshops gevonden. Probeer een andere zoekterm of categorie.",
  clear: "Wis filters", previous: "Vorige", next: "Volgende", page: "Pagina", of: "van",
  offerOne: "aanbieding", offerMany: "aanbiedingen", description: "Ontdek de aanbiedingen van deze webshop.",
  from: "vanaf", creditUnit: "tegoed", discount: "korting",
};

type Copy = Record<keyof typeof nl, string>;
const en: Copy = {
  all: "All categories", home: "Home & living", fashion: "Fashion", tech: "Electronics", beauty: "Beauty",
  relevance: "Relevance", mostOffers: "Most offers", name: "Name A–Z", newest: "Recently added",
  voucherLoading: "Loading vouchers…", voucherUnavailable: "Vouchers unavailable",
  voucherOne: "active voucher", voucherMany: "active vouchers",
  eyebrow: "MORE WEBSHOPS. MORE BENEFITS.", title: "Discover webshops and offers.",
  introduction: "Browse hundreds of webshops and enjoy unique discount vouchers with ShopBonus.",
  credit: "My ShopBonus credit", guestTitle: "View your credit and vouchers",
  guestHint: "Log in to see your ShopBonus balance.", login: "Log in",
  search: "Search for a webshop", searchPlaceholder: "Search for a webshop...", hasOffers: "With active offers", sort: "Sort",
  errorTitle: "Could not load webshops", errorHint: "Something went wrong. Please try again later.", retry: "Try again",
  emptyTitle: "No webshops found", emptyHint: "No webshops found. Try another search term or category.",
  clear: "Clear filters", previous: "Previous", next: "Next", page: "Page", of: "of",
  offerOne: "offer", offerMany: "offers", description: "Discover this webshop’s offers.",
  from: "from", creditUnit: "credit", discount: "discount",
};

const de: Copy = {
  all: "Alle Kategorien", home: "Wohnen", fashion: "Mode", tech: "Elektronik", beauty: "Beauty",
  relevance: "Relevanz", mostOffers: "Die meisten Angebote", name: "Name A–Z", newest: "Neu hinzugefügt",
  voucherLoading: "Gutscheine werden geladen…", voucherUnavailable: "Gutscheine nicht verfügbar",
  voucherOne: "aktiver Gutschein", voucherMany: "aktive Gutscheine",
  eyebrow: "MEHR WEBSHOPS. MEHR VORTEILE.", title: "Entdecke Webshops und Angebote.",
  introduction: "Entdecke Hunderte Webshops und sichere dir exklusive Rabattgutscheine mit ShopBonus.",
  credit: "Mein ShopBonus-Guthaben", guestTitle: "Dein Guthaben und deine Gutscheine",
  guestHint: "Melde dich an, um dein ShopBonus-Guthaben zu sehen.", login: "Anmelden",
  search: "Webshop suchen", searchPlaceholder: "Webshop suchen...", hasOffers: "Mit aktiven Angeboten", sort: "Sortieren",
  errorTitle: "Webshops konnten nicht geladen werden", errorHint: "Ein Fehler ist aufgetreten. Bitte versuche es später erneut.", retry: "Erneut versuchen",
  emptyTitle: "Keine Webshops gefunden", emptyHint: "Keine Webshops gefunden. Versuche einen anderen Suchbegriff oder eine andere Kategorie.",
  clear: "Filter löschen", previous: "Zurück", next: "Weiter", page: "Seite", of: "von",
  offerOne: "Angebot", offerMany: "Angebote", description: "Entdecke die Angebote dieses Webshops.",
  from: "ab", creditUnit: "Guthaben", discount: "Rabatt",
};

export const discoveryCopy: Record<Locale, Copy> = { nl, en, de };
