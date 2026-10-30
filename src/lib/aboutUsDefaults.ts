export type Cta = { label: string; href: string };

export type ValueIcon = "tag" | "shop" | "users";

export type ValueItem = {
  icon: ValueIcon;
  title: string;
  description: string;
};

export type TeamProfile = {
  name: string;
  role?: string;
  bio?: string;
  photo_asset_id?: string | null;
  photo_url?: string | null;
  linkedin_href?: string | null;
};

export type AboutUsContent = {
  title: string;
  seo_title: string;
  seo_description: string;
  seo_image_asset_id?: string | null;
  seo_image_url?: string | null;
  section_order: string[];
  section_visibility: Record<string, boolean>;
  nav: {
    links: Cta[];
    login_label: string;
    login_href: string;
    cta_label: string;
    cta_href: string;
    logo_alt: string;
  };
  hero: {
    eyebrow: string;
    heading: string;
    heading_accent: string;
    subtitle: string;
    cta_label: string;
    cta_href: string;
    float_title: string;
    float_text: string;
    image_asset_id?: string | null;
    image_url?: string | null;
  };
  story: {
    eyebrow: string;
    heading: string;
    heading_accent: string;
    paragraphs: string[];
    image_asset_id?: string | null;
    image_url?: string | null;
  };
  revenue_model: {
    eyebrow: string;
    heading: string;
    explanation: string;
    consumer_label: string;
    consumer_description: string;
    platform_label: string;
    platform_description: string;
    footnote: string;
    /** Injected from commercial config — not editable as an authoritative CMS field */
    consumer_percent?: number;
    platform_percent?: number;
  };
  values: {
    eyebrow: string;
    heading: string;
    introduction: string;
    items: ValueItem[];
  };
  team: {
    eyebrow: string;
    heading: string;
    body: string;
    quote: string;
    image_asset_id?: string | null;
    image_url?: string | null;
    show_profiles: boolean;
    profiles: TeamProfile[];
    placeholder_label: string;
  };
  contact: {
    heading: string;
    intro: string;
    links: Cta[];
    legal_name: string;
    address: string;
    kvk: string;
    email: string;
  };
  bottom_cta: {
    eyebrow: string;
    heading: string;
    heading_accent: string;
    description: string;
    consumer_cta: Cta;
    merchant_cta: Cta;
  };
  footer: { blurb: string };
  schedule?: { publish_at?: string | null; unpublish_at?: string | null } | null;
};

export const SECTION_KEYS = [
  "hero",
  "story",
  "revenue_model",
  "values",
  "team",
  "contact",
  "bottom_cta",
] as const;

function defaultsNl(): AboutUsContent {
  return {
    title: "Over ShopBonus",
    seo_title: "Over ShopBonus — cashback, vouchers en eerlijk voordeel",
    seo_description:
      "Leer hoe ShopBonus consumenten en webshops verbindt met aantrekkelijke aanbiedingen, cashback en vouchers.",
    section_order: [...SECTION_KEYS],
    section_visibility: Object.fromEntries(SECTION_KEYS.map((k) => [k, true])),
    nav: {
      links: [
        { label: "Webshops", href: "/webshops" },
        { label: "Cashback", href: "/webshops?has_offers=1" },
        { label: "Kortingscodes", href: "/kortingscodes" },
        { label: "Over ons", href: "/over-ons" },
        { label: "Voor webshops", href: "/voor-webshops" },
      ],
      login_label: "Inloggen",
      login_href: "/account?mode=login",
      cta_label: "Account aanmaken",
      cta_href: "/account?mode=register",
      logo_alt: "ShopBonus",
    },
    hero: {
      eyebrow: "OVER SHOPBONUS",
      heading: "Samen maken we online shoppen",
      heading_accent: "voordeliger.",
      subtitle:
        "Wij verbinden consumenten en webshops met aantrekkelijke aanbiedingen, cashback en vouchers. Eenvoudig, transparant en voor beide kanten waardevol.",
      cta_label: "Ontdek ons verhaal",
      cta_href: "#verhaal",
      float_title: "Eerlijk voordeel",
      float_text: "Aantrekkelijke deals en cashback, altijd transparant.",
    },
    story: {
      eyebrow: "ONS VERHAAL",
      heading: "Een goed idee verdient",
      heading_accent: "meer dan korting.",
      paragraphs: [
        "ShopBonus is ontstaan vanuit de overtuiging dat online shoppen eenvoudiger, aantrekkelijker en voordeliger kan.",
        "Wij brengen consumenten en webshops dichter bij elkaar. Consumenten ontdekken aanbiedingen en sparen via cashback voor vouchers. Webshops krijgen een extra mogelijkheid om hun producten en acties onder de aandacht te brengen.",
        "Zo bouwen we aan een platform waar beide kanten voordeel van kunnen hebben.",
      ],
      image_asset_id: null,
    },
    revenue_model: {
      eyebrow: "TRANSPARANT OVER ONS VERDIENMODEL",
      heading: "Eerlijk verdeeld. Meer waarde voor iedereen.",
      explanation:
        "Wanneer een consument via ShopBonus een geldige aankoop doet bij een deelnemende webshop, kan ShopBonus daarvoor een commissie ontvangen. Die commissie verdelen we volgens de afgesproken voorwaarden.",
      consumer_label: "voor de consument",
      consumer_description:
        "Het standaardaandeel van de toepasselijke commissie dat als cashback kan worden toegekend.",
      platform_label: "voor ShopBonus",
      platform_description:
        "Het standaardaandeel waarmee we het platform onderhouden en verder ontwikkelen.",
      footnote:
        "De standaardverdeling is 70/30. Afwijkende afspraken zijn mogelijk. De berekening is afhankelijk van de geldige commissiegrondslag en actievoorwaarden.",
      consumer_percent: 70,
      platform_percent: 30,
    },
    values: {
      eyebrow: "WAAR WIJ IN GELOVEN",
      heading: "Meer dan alleen kortingen.",
      introduction:
        "Wij willen online shoppen duidelijker, aantrekkelijker en toegankelijker maken. Dat vormt de basis van ShopBonus.",
      items: [
        {
          icon: "tag",
          title: "Eerlijk voordeel",
          description:
            "Aantrekkelijke aanbiedingen met duidelijke voorwaarden, zodat consumenten begrijpen welk voordeel ze kunnen ontvangen.",
        },
        {
          icon: "shop",
          title: "Vrijheid voor webshops",
          description:
            "Webshops bepalen hun commerciële afspraken en welke aanbiedingen zij beschikbaar willen stellen.",
        },
        {
          icon: "users",
          title: "Eenvoud voor iedereen",
          description:
            "Een gebruiksvriendelijk platform waar consumenten eenvoudig aanbiedingen ontdekken en sparen voor vouchers.",
        },
      ],
    },
    team: {
      eyebrow: "DE MENSEN ACHTER SHOPBONUS",
      heading: "Een betrokken team met een duidelijke missie.",
      body: "Achter ShopBonus werken mensen aan een platform dat online winkelen voor consumenten en ondernemers aantrekkelijker maakt. We combineren commercieel inzicht met slimme technologie en duidelijke afspraken.",
      quote:
        "We geloven in een online wereld waarin consumenten en webshops samen meer bereiken.",
      show_profiles: false,
      profiles: [],
      placeholder_label: "Foto oprichter toevoegen",
    },
    contact: {
      heading: "Contact met ShopBonus",
      intro:
        "Heb je een vraag over ShopBonus, cashback, vouchers of samenwerken met ons? We helpen je graag verder.",
      links: [
        { label: "Contact", href: "/support" },
        { label: "Privacy", href: "/pagina/privacy" },
        { label: "Voorwaarden", href: "/pagina/voorwaarden" },
        { label: "Bedrijfsgegevens", href: "/over-ons#contact" },
      ],
      legal_name: "",
      address: "",
      kvk: "",
      email: "",
    },
    bottom_cta: {
      eyebrow: "SAMEN NAAR EEN SLIMMERE TOEKOMST",
      heading: "Samen maken we shoppen",
      heading_accent: "slimmer.",
      description:
        "Of je nu op zoek bent naar de beste aanbiedingen of als webshop wilt groeien: we doen het samen. Ontdek wat ShopBonus voor jou kan betekenen.",
      consumer_cta: { label: "Ontdek aanbiedingen", href: "/webshops" },
      merchant_cta: { label: "Voor webshops", href: "/voor-webshops" },
    },
    footer: {
      blurb:
        "ShopBonus verbindt consumenten en webshops met cashback, kortingscodes en vouchers. Wallet-saldo wissel je in voor vouchers — nooit voor contant geld.",
    },
  };
}

function defaultsEn(): AboutUsContent {
  return {
    title: "About ShopBonus",
    seo_title: "About ShopBonus — cashback, vouchers and fair value",
    seo_description:
      "Learn how ShopBonus connects consumers and webshops with attractive offers, cashback and vouchers.",
    section_order: [...SECTION_KEYS],
    section_visibility: Object.fromEntries(SECTION_KEYS.map((k) => [k, true])),
    nav: {
      links: [
        { label: "Webshops", href: "/webshops" },
        { label: "Cashback", href: "/webshops?has_offers=1" },
        { label: "Discount codes", href: "/kortingscodes" },
        { label: "About us", href: "/over-ons" },
        { label: "For webshops", href: "/voor-webshops" },
      ],
      login_label: "Log in",
      login_href: "/account?mode=login",
      cta_label: "Create account",
      cta_href: "/account?mode=register",
      logo_alt: "ShopBonus",
    },
    hero: {
      eyebrow: "ABOUT SHOPBONUS",
      heading: "Together we make online shopping",
      heading_accent: "more rewarding.",
      subtitle:
        "We connect consumers and webshops with attractive offers, cashback and vouchers. Simple, transparent and valuable for both sides.",
      cta_label: "Discover our story",
      cta_href: "#verhaal",
      float_title: "Fair value",
      float_text: "Attractive deals and cashback, always transparent.",
    },
    story: {
      eyebrow: "OUR STORY",
      heading: "A good idea deserves",
      heading_accent: "more than a discount.",
      paragraphs: [
        "ShopBonus started from the conviction that online shopping can be simpler, more attractive and more rewarding.",
        "We bring consumers and webshops closer together. Consumers discover offers and save via cashback for vouchers. Webshops get an extra way to highlight their products and campaigns.",
        "That is how we build a platform both sides can benefit from.",
      ],
    },
    revenue_model: {
      eyebrow: "TRANSPARENT ABOUT OUR REVENUE MODEL",
      heading: "Fairly shared. More value for everyone.",
      explanation:
        "When a consumer completes a valid purchase at a participating webshop via ShopBonus, ShopBonus may receive a commission. We share that commission according to the agreed terms.",
      consumer_label: "for the consumer",
      consumer_description:
        "The default share of the applicable commission that may be awarded as cashback.",
      platform_label: "for ShopBonus",
      platform_description:
        "The default share used to maintain and further develop the platform.",
      footnote:
        "The default split is 70/30. Different agreements are possible. The calculation depends on the valid commission base and campaign terms.",
      consumer_percent: 70,
      platform_percent: 30,
    },
    values: {
      eyebrow: "WHAT WE BELIEVE IN",
      heading: "More than just discounts.",
      introduction:
        "We want to make online shopping clearer, more attractive and more accessible. That is the foundation of ShopBonus.",
      items: [
        {
          icon: "tag",
          title: "Fair value",
          description:
            "Attractive offers with clear terms, so consumers understand the benefit they can receive.",
        },
        {
          icon: "shop",
          title: "Freedom for webshops",
          description:
            "Webshops set their commercial terms and which offers they want to make available.",
        },
        {
          icon: "users",
          title: "Simplicity for everyone",
          description:
            "A user-friendly platform where consumers easily discover offers and save for vouchers.",
        },
      ],
    },
    team: {
      eyebrow: "THE PEOPLE BEHIND SHOPBONUS",
      heading: "A dedicated team with a clear mission.",
      body: "Behind ShopBonus, people work on a platform that makes online shopping more attractive for consumers and entrepreneurs. We combine commercial insight with smart technology and clear agreements.",
      quote:
        "We believe in an online world where consumers and webshops achieve more together.",
      show_profiles: false,
      profiles: [],
      placeholder_label: "Add founder photo",
    },
    contact: {
      heading: "Contact ShopBonus",
      intro:
        "Do you have a question about ShopBonus, cashback, vouchers or working with us? We are happy to help.",
      links: [
        { label: "Contact", href: "/support" },
        { label: "Privacy", href: "/pagina/privacy" },
        { label: "Terms", href: "/pagina/voorwaarden" },
        { label: "Company info", href: "/over-ons#contact" },
      ],
      legal_name: "",
      address: "",
      kvk: "",
      email: "",
    },
    bottom_cta: {
      eyebrow: "TOGETHER TOWARD A SMARTER FUTURE",
      heading: "Together we make shopping",
      heading_accent: "smarter.",
      description:
        "Whether you are looking for the best deals or want to grow as a webshop: we do it together. Discover what ShopBonus can mean for you.",
      consumer_cta: { label: "Discover offers", href: "/webshops" },
      merchant_cta: { label: "For webshops", href: "/voor-webshops" },
    },
    footer: {
      blurb:
        "ShopBonus connects consumers and webshops with cashback, discount codes and vouchers. Redeem wallet balance for vouchers — never for cash.",
    },
  };
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function mergeDeep<T extends Record<string, unknown>>(base: T, partial: unknown): T {
  if (!isObject(partial)) return base;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;
    const current = out[key];
    if (Array.isArray(value)) {
      out[key] = value;
    } else if (isObject(value) && isObject(current)) {
      out[key] = mergeDeep(current, value);
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

export function mergeAboutUsContent(
  partial: Partial<AboutUsContent> | null | undefined,
  locale: "nl" | "en" = "nl"
): AboutUsContent {
  const base = locale === "en" ? defaultsEn() : defaultsNl();
  if (!partial) return base;
  const merged = mergeDeep(base as unknown as Record<string, unknown>, partial) as unknown as AboutUsContent;
  if (!merged.section_order?.length) merged.section_order = [...SECTION_KEYS];
  if (!merged.section_visibility) {
    merged.section_visibility = Object.fromEntries(SECTION_KEYS.map((k) => [k, true]));
  }
  // Percentages come from API enrichment; keep defaults if missing
  if (typeof merged.revenue_model.consumer_percent !== "number") {
    merged.revenue_model.consumer_percent = 70;
  }
  if (typeof merged.revenue_model.platform_percent !== "number") {
    merged.revenue_model.platform_percent = 30;
  }
  if (!merged.team.show_profiles) {
    merged.team.profiles = [];
  }
  return merged;
}
