/** Default NL homepage CMS payload matching the approved screenshot copy. */

export type HomepageCta = { label: string; href: string };

export type HomepageContent = {
  title: string;
  seo_title: string;
  seo_description: string;
  seo_image_asset_id?: string | null;
  section_order: string[];
  section_visibility: Record<string, boolean>;
  nav: {
    logo_alt: string;
    links: HomepageCta[];
  };
  hero: {
    heading: string;
    subtitle: string;
    primary_cta: HomepageCta;
    secondary_cta: HomepageCta;
    trust: string[];
    artwork_note: string;
    promo_balance_example: string;
    promo_voucher_example: string;
    background_asset_id?: string | null;
  };
  search: { placeholder: string };
  popular_webshops: {
    heading: string;
    cta_label: string;
    cta_href: string;
    mode: "auto" | "featured";
    featured_slugs: string[];
    limit: number;
  };
  how_it_works: {
    heading: string;
    subtitle: string;
    steps: { title: string; description: string }[];
  };
  discount_codes: {
    heading: string;
    cta_label: string;
    cta_href: string;
    limit: number;
  };
  wallet_preview: {
    heading: string;
    guest_text: string;
    guest_cta: HomepageCta;
    voucher_cta: HomepageCta;
    transactions_cta: HomepageCta;
  };
  benefits?: {
    heading: string;
    consumer_title: string;
    consumer_items: string[];
    merchant_title: string;
    merchant_items: string[];
  };
  cta_band?: {
    heading: string;
    subtitle: string;
    consumer_cta: HomepageCta;
    merchant_cta: HomepageCta;
  };
  faq_teaser?: {
    heading: string;
    subtitle: string;
    cta_label: string;
    cta_href: string;
  };
  footer?: { blurb?: string };
  schedule?: { publish_at?: string | null; unpublish_at?: string | null } | null;
  seo_image_url?: string | null;
};

export const DEFAULT_HOMEPAGE_NL: HomepageContent = {
  title: "ShopBonus",
  seo_title: "ShopBonus — Spaar cashback voor vouchers",
  seo_description:
    "Ontdek korting, cashback en vouchers bij jouw favoriete webshops. Spaar in je ShopBonus-wallet — zonder cashuitbetaling.",
  seo_image_asset_id: null,
  section_order: [
    "hero",
    "search",
    "popular_webshops",
    "how_it_works",
    "benefits",
    "discount_codes",
    "wallet_preview",
    "cta_band",
    "faq_teaser",
  ],
  section_visibility: {
    hero: true,
    search: true,
    popular_webshops: true,
    how_it_works: true,
    benefits: true,
    discount_codes: true,
    wallet_preview: true,
    cta_band: true,
    faq_teaser: true,
  },
  nav: {
    logo_alt: "ShopBonus",
    links: [
      { label: "Webshops", href: "/webshops" },
      { label: "Kortingscodes", href: "/kortingscodes" },
      { label: "Hoe werkt het?", href: "/hoe-werkt-het" },
      { label: "Over ons", href: "/over-ons" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/over-ons#contact" },
      { label: "Voor webshops", href: "/voor-webshops" },
    ],
  },
  hero: {
    heading: "Shop zoals je altijd doet.\nSpaar voor wat je écht wilt.",
    subtitle: "Ontdek korting, cashback en vouchers bij jouw favoriete webshops.",
    primary_cta: { label: "Ontdek aanbiedingen", href: "/webshops" },
    secondary_cta: { label: "Hoe werkt het?", href: "/hoe-werkt-het" },
    trust: [
      "Gratis aanmelden",
      "Kortingscodes en cashback",
      "Sparen voor vouchers",
    ],
    artwork_note: "Spaar voor cadeaubonnen van jouw favoriete winkels",
    promo_balance_example: "€ 42,50",
    promo_voucher_example: "€ 25",
    background_asset_id: null,
  },
  search: {
    placeholder: "Zoek een webshop of aanbieding...",
  },
  popular_webshops: {
    heading: "Populaire webshops",
    cta_label: "Bekijk alle webshops →",
    cta_href: "/webshops",
    mode: "auto",
    featured_slugs: [],
    limit: 4,
  },
  how_it_works: {
    heading: "Zo werkt ShopBonus",
    subtitle: "In 3 simpele stappen naar meer voordeel.",
    steps: [
      {
        title: "Ontdek voordeel",
        description:
          "Zoek je favoriete webshop en bekijk actuele kortingscodes en cashbackaanbiedingen.",
      },
      {
        title: "Shop via ShopBonus",
        description:
          "Klik door naar de webshop en bestel zoals je gewend bent. Gebruik eventueel een geldige kortingscode.",
      },
      {
        title: "Spaar voor vouchers",
        description:
          "Ontvang bij deelnemende, geldige aankopen cashback in je ShopBonus-wallet. Wissel je saldo in voor een voucher.",
      },
    ],
  },
  discount_codes: {
    heading: "Actuele kortingscodes",
    cta_label: "Bekijk alle kortingscodes →",
    cta_href: "/kortingscodes",
    limit: 2,
  },
  wallet_preview: {
    heading: "Jouw ShopBonus-wallet",
    guest_text:
      "Maak een gratis account en spaar cashback voor vouchers bij favoriete webshops. Je tegoed is alleen inwisselbaar voor vouchers.",
    guest_cta: { label: "Account aanmaken", href: "/account" },
    voucher_cta: { label: "Voucher kiezen", href: "/mijn-voordelen" },
    transactions_cta: { label: "Bekijk transacties", href: "/mijn-voordelen" },
  },
  benefits: {
    heading: "Voordeel voor iedereen",
    consumer_title: "Voor consumenten",
    consumer_items: [
      "Ontdek echte deelnemende webshops en gepubliceerde aanbiedingen",
      "Spaar geverifieerde punten in één centrale wallet",
      "Wissel in voor webshop-gefinancierde kortingsvouchers",
    ],
    merchant_title: "Voor webshops",
    merchant_items: [
      "Bereik shoppers die actief zoeken naar voordeel",
      "Publiceer goedgekeurde aanbiedingen met leesbare slugs",
      "Behoud controle over publieke informatie en voorwaarden",
    ],
  },
  cta_band: {
    heading: "Start vandaag",
    subtitle: "Maak een consumentenaccount of meld je webshop aan bij ShopBonus.",
    consumer_cta: { label: "Account aanmaken", href: "/account" },
    merchant_cta: { label: "Webshop aanmelden", href: "/voor-webshops" },
  },
  faq_teaser: {
    heading: "Veelgestelde vragen",
    subtitle: "Over punten, vouchers, privacy en hoe ShopBonus werkt.",
    cta_label: "Bekijk de FAQ →",
    cta_href: "/faq",
  },
  footer: {
    blurb:
      "Samen maken we online shoppen voordeliger. Cashback, kortingsvouchers en eerlijke deals bij aangesloten webshops.",
  },
};

export const DEFAULT_HOMEPAGE_EN: HomepageContent = {
  ...DEFAULT_HOMEPAGE_NL,
  title: "ShopBonus",
  seo_title: "ShopBonus — Save cashback for vouchers",
  seo_description:
    "Discover discounts, cashback and vouchers at your favourite webshops. Save in your ShopBonus wallet and redeem for vouchers only.",
  hero: {
    ...DEFAULT_HOMEPAGE_NL.hero,
    heading: "Shop the way you always do.\nSave for what you really want.",
    subtitle: "Discover discounts, cashback and vouchers at your favourite webshops.",
    primary_cta: { label: "Discover offers", href: "/webshops" },
    secondary_cta: { label: "How it works", href: "/hoe-werkt-het" },
    trust: [
      "Free to join",
      "Discount codes and cashback",
      "Save for vouchers",
    ],
    artwork_note: "Save for gift cards from your favourite stores",
  },
  search: { placeholder: "Search a webshop or offer..." },
  popular_webshops: {
    ...DEFAULT_HOMEPAGE_NL.popular_webshops,
    heading: "Popular webshops",
    cta_label: "View all webshops →",
  },
  how_it_works: {
    heading: "How ShopBonus works",
    subtitle: "More value in 3 simple steps.",
    steps: [
      {
        title: "Discover deals",
        description:
          "Find your favourite webshop and browse current discount codes and cashback offers.",
      },
      {
        title: "Shop via ShopBonus",
        description:
          "Click through to the webshop and order as usual. Use a valid discount code when available.",
      },
      {
        title: "Save for vouchers",
        description:
          "On eligible purchases at participating shops, receive cashback in your ShopBonus wallet. Redeem your balance for a voucher.",
      },
    ],
  },
  discount_codes: {
    ...DEFAULT_HOMEPAGE_NL.discount_codes,
    heading: "Current discount codes",
    cta_label: "View all discount codes →",
  },
  wallet_preview: {
    heading: "Your ShopBonus wallet",
    guest_text:
      "Create a free account and save cashback for vouchers at favourite webshops. Your credit can only be redeemed for vouchers.",
    guest_cta: { label: "Create account", href: "/account" },
    voucher_cta: { label: "Choose voucher", href: "/mijn-voordelen" },
    transactions_cta: { label: "View transactions", href: "/mijn-voordelen" },
  },
  benefits: {
    heading: "Value for everyone",
    consumer_title: "For consumers",
    consumer_items: [
      "Discover real participating webshops and published offers",
      "Earn verified points in one central wallet",
      "Redeem for webshop-funded discount vouchers",
    ],
    merchant_title: "For webshops",
    merchant_items: [
      "Reach shoppers actively looking for value",
      "Publish approved offers with readable slugs",
      "Keep control of public information and terms",
    ],
  },
  cta_band: {
    heading: "Get started today",
    subtitle: "Create a consumer account or register your webshop with ShopBonus.",
    consumer_cta: { label: "Create account", href: "/account" },
    merchant_cta: { label: "Register a webshop", href: "/voor-webshops" },
  },
  faq_teaser: {
    heading: "Frequently asked questions",
    subtitle: "About points, vouchers, privacy and how ShopBonus works.",
    cta_label: "View the FAQ →",
    cta_href: "/faq",
  },
};

export function mergeHomepageContent(
  partial: Partial<HomepageContent> | null | undefined,
  locale: "nl" | "en" = "nl"
): HomepageContent {
  const base = locale === "en" ? DEFAULT_HOMEPAGE_EN : DEFAULT_HOMEPAGE_NL;
  if (!partial) return base;
  return {
    ...base,
    ...partial,
    nav: { ...base.nav, ...(partial.nav ?? {}) },
    hero: { ...base.hero, ...(partial.hero ?? {}) },
    search: { ...base.search, ...(partial.search ?? {}) },
    popular_webshops: { ...base.popular_webshops, ...(partial.popular_webshops ?? {}) },
    how_it_works: {
      ...base.how_it_works,
      ...(partial.how_it_works ?? {}),
      steps: partial.how_it_works?.steps?.length
        ? partial.how_it_works.steps
        : base.how_it_works.steps,
    },
    discount_codes: { ...base.discount_codes, ...(partial.discount_codes ?? {}) },
    wallet_preview: { ...base.wallet_preview, ...(partial.wallet_preview ?? {}) },
    benefits: { ...base.benefits!, ...(partial.benefits ?? {}) },
    cta_band: { ...base.cta_band!, ...(partial.cta_band ?? {}) },
    faq_teaser: { ...base.faq_teaser!, ...(partial.faq_teaser ?? {}) },
    section_visibility: { ...base.section_visibility, ...(partial.section_visibility ?? {}) },
    section_order: partial.section_order?.length ? partial.section_order : base.section_order,
  };
}
