export type Cta = { label: string; href: string };

export type PlatformStatus = "AVAILABLE" | "BETA" | "COMING_SOON" | "MANUAL_SETUP";

export type PlatformTile = {
  platform: string;
  name: string;
  status: PlatformStatus;
  href: string;
  connectable?: boolean;
  blocked_reason?: string | null;
};

export type BenefitItem = {
  icon: "people" | "tag" | "cog" | "chart" | "shield" | "spark";
  title: string;
  description: string;
};

export type OnboardingStep = {
  number: string;
  title: string;
  description: string;
  icon?: "document" | "link" | "megaphone" | "check" | "shop";
};

export type FaqItem = { question: string; answer: string };

export type MerchantLandingContent = {
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
    subtitle: string;
    primary_cta: Cta;
    secondary_cta: Cta;
    trust: string[];
    artwork_note?: string;
    background_asset_id?: string | null;
    background_url?: string | null;
    illustration_asset_id?: string | null;
    illustration_url?: string | null;
  };
  platforms: {
    heading: string;
    subtitle: string;
    cta_label?: string;
    cta_href?: string;
    tiles: PlatformTile[];
  };
  benefits: {
    eyebrow: string;
    heading: string;
    description: string;
    image_asset_id?: string | null;
    image_url?: string | null;
    items: BenefitItem[];
  };
  offer_preview: {
    eyebrow: string;
    heading: string;
    description: string;
    cta_label: string;
    cta_href: string;
    preview_asset_id?: string | null;
    preview_url?: string | null;
    illustrative?: boolean;
  };
  onboarding: {
    eyebrow: string;
    heading: string;
    steps: OnboardingStep[];
  };
  bottom_cta: {
    eyebrow: string;
    heading: string;
    description: string;
    cta_label: string;
    cta_href: string;
  };
  faq: {
    heading: string;
    items: FaqItem[];
  };
  footer: { blurb: string };
  schedule?: { publish_at?: string | null; unpublish_at?: string | null } | null;
};

const REGISTER = "/voor-webshops/aanmelden";

export const SECTION_KEYS = [
  "hero",
  "platforms",
  "benefits",
  "offer_preview",
  "onboarding",
  "bottom_cta",
  "faq",
] as const;

function defaultsNl(): MerchantLandingContent {
  return {
    title: "ShopBonus voor webshops",
    seo_title: "ShopBonus voor webshops — meer klanten, alleen betalen voor resultaat",
    seo_description:
      "Maak jouw webshop aantrekkelijker met cashback, kortingscodes en vouchers. Jij bepaalt de voorwaarden.",
    section_order: [...SECTION_KEYS],
    section_visibility: Object.fromEntries(SECTION_KEYS.map((k) => [k, true])),
    nav: {
      links: [
        { label: "Voordelen", href: "#voordelen" },
        { label: "Zo werkt het", href: "#zo-werkt-het" },
        { label: "Integraties", href: "#integraties" },
        { label: "Veelgestelde vragen", href: "#faq" },
      ],
      login_label: "Inloggen",
      login_href: "/account?mode=login&role=merchant",
      cta_label: "Webshop aanmelden",
      cta_href: REGISTER,
      logo_alt: "ShopBonus",
    },
    hero: {
      eyebrow: "VOOR WEBSHOPS",
      heading: "Meer klanten. Meer bestellingen.\nAlleen betalen voor resultaat.",
      subtitle:
        "Maak jouw webshop aantrekkelijker met cashback, kortingscodes en vouchers. Jij bepaalt de voorwaarden.",
      primary_cta: { label: "Sluit je webshop aan", href: REGISTER },
      secondary_cta: { label: "Bekijk hoe het werkt", href: "#zo-werkt-het" },
      trust: ["Zelf commissie bepalen", "Snel aansluiten", "Meer zichtbaarheid"],
      artwork_note: "Promotionele illustratie — geen live resultaten",
    },
    platforms: {
      heading: "Werkt met de populairste platforms",
      subtitle: "Verbind je webshop met een ondersteunde integratie.",
      cta_label: "Bekijk alle integraties",
      cta_href: `${REGISTER}#platforms`,
      tiles: [
        { platform: "shopify", name: "Shopify", status: "AVAILABLE", href: `${REGISTER}?platform=shopify` },
        { platform: "woocommerce", name: "WooCommerce", status: "AVAILABLE", href: `${REGISTER}?platform=woocommerce` },
        { platform: "wix", name: "Wix", status: "AVAILABLE", href: `${REGISTER}?platform=wix` },
        { platform: "bigcommerce", name: "BigCommerce", status: "AVAILABLE", href: `${REGISTER}?platform=bigcommerce` },
        { platform: "ecwid", name: "Ecwid", status: "AVAILABLE", href: `${REGISTER}?platform=ecwid` },
        { platform: "lightspeed_c", name: "Lightspeed C-Series", status: "AVAILABLE", href: `${REGISTER}?platform=lightspeed_c` },
        { platform: "prestashop", name: "PrestaShop", status: "MANUAL_SETUP", href: `${REGISTER}?platform=prestashop` },
        { platform: "opencart", name: "OpenCart", status: "MANUAL_SETUP", href: `${REGISTER}?platform=opencart` },
        { platform: "shopware6", name: "Shopware", status: "MANUAL_SETUP", href: `${REGISTER}?platform=shopware6` },
        { platform: "magento", name: "Adobe Commerce / Magento", status: "MANUAL_SETUP", href: `${REGISTER}?platform=magento` },
      ],
    },
    benefits: {
      eyebrow: "GROEI MET SHOPBONUS",
      heading: "Maak je webshop\nonweerstaanbaar.",
      description:
        "Bereik nieuwe klanten met aantrekkelijke aanbiedingen via ShopBonus. Jij houdt de controle over jouw acties en commerciële voorwaarden.",
      items: [
        {
          icon: "people",
          title: "Bereik nieuwe klanten",
          description:
            "Maak jouw webshop zichtbaar voor consumenten die gericht zoeken naar aanbiedingen en nieuwe winkels.",
        },
        {
          icon: "tag",
          title: "Kortingen én cashback",
          description:
            "Promoot geldige kortingscodes, cashbackacties of een combinatie daarvan, afhankelijk van jouw voorwaarden.",
        },
        {
          icon: "cog",
          title: "Jij bepaalt de commissie",
          description: "Stel je commerciële afspraken in en houd controle over je marges.",
        },
      ],
    },
    offer_preview: {
      eyebrow: "ZO ZIEN JOUW AANBIEDINGEN ERUIT",
      heading: "Jouw aanbiedingen.\nProfessioneel gepresenteerd.",
      description:
        "Jouw cashbackacties en kortingscodes worden op een aantrekkelijke en overzichtelijke manier getoond. Zo ontdekken consumenten eenvoudig wat jouw webshop te bieden heeft.",
      cta_label: "Bekijk een voorbeeld",
      cta_href: "/webshops",
      illustrative: true,
    },
    onboarding: {
      eyebrow: "IN 3 EENVOUDIGE STAPPEN",
      heading: "Binnen enkele stappen live.",
      steps: [
        {
          number: "01",
          title: "Aanmelden",
          description: "Maak een account aan en registreer jouw webshop.",
          icon: "document",
        },
        {
          number: "02",
          title: "Koppelen",
          description:
            "Verbind jouw webshop via een ondersteunde integratie of beschikbare alternatieve aansluitmethode.",
          icon: "link",
        },
        {
          number: "03",
          title: "Start met aanbiedingen",
          description:
            "Stel jouw commissies en acties in. Na goedkeuring verschijnt jouw webshop op ShopBonus.",
          icon: "megaphone",
        },
      ],
    },
    bottom_cta: {
      eyebrow: "START MET SHOPBONUS",
      heading: "Klaar om nieuwe klanten te bereiken?",
      description:
        "Maak jouw aanbod zichtbaar voor koopjesjagers en bepaal zelf jouw commerciële voorwaarden.",
      cta_label: "Webshop aanmelden →",
      cta_href: REGISTER,
    },
    faq: {
      heading: "Veelgestelde vragen",
      items: [
        {
          question: "Wat kost aansluiten bij ShopBonus?",
          answer:
            "Aansluiten zelf is gratis. Je betaalt alleen wanneer er resultaat is via je afgesproken commissie of actievoorwaarden. Er is geen vast abonnement.",
        },
        {
          question: "Hoe werkt de commissie?",
          answer:
            "Jij stelt je commerciële afspraak in. Bij cashback via affiliate- of commissieafspraken is de standaardverdeling 70% voor de klant en 30% voor ShopBonus, tenzij Super Admin een uitzondering goedkeurt. De commissie is niet automatisch gelijk aan de cashback die de consument ziet.",
        },
        {
          question: "Kan ik mijn eigen cashbackacties instellen?",
          answer:
            "Ja, zodra je webshop is goedgekeurd en er een geldig cashbackprogramma of merchant-akkoord is. Cashbackacties en kortingscodes zijn aparte aanbiedingstypen.",
        },
        {
          question: "Welke webshopplatformen ondersteunen jullie?",
          answer:
            "Onder meer Shopify, WooCommerce, Wix en andere platforms met connector of handmatige module. Status (beschikbaar, handmatige setup of binnenkort) staat per platform vermeld — een logo betekent niet automatisch een live koppeling.",
        },
        {
          question: "Kan ik kortingscodes toevoegen?",
          answer:
            "Ja. Je kunt geldige kortingscodes aanmaken of importeren. Alleen goedgekeurde, actieve aanbiedingen verschijnen publiek.",
        },
        {
          question: "Wanneer verschijnt mijn webshop op ShopBonus?",
          answer:
            "Na afronding van onboarding, verificatie en goedkeuring door ShopBonus. Activatie is niet instant wanneer verificatie vereist is.",
        },
        {
          question: "Hoe worden bestellingen geregistreerd?",
          answer:
            "Via de gekoppelde integratie (webhooks of module) of een goedgekeurde alternatieve aansluitmethode. Alleen gevalideerde, in aanmerking komende bestellingen tellen mee voor cashbackberekening.",
        },
        {
          question: "Kan ik mijn aanbiedingen aanpassen?",
          answer:
            "Ja. Je beheert commissies, cashbackacties en kortingscodes vanuit het merchant-dashboard. Publieke weergave volgt altijd de goedkeurings- en publicatieregels.",
        },
      ],
    },
    footer: {
      blurb:
        "ShopBonus helpt webshops nieuwe klanten bereiken met cashback, kortingscodes en vouchers. Consumenten wisselen wallet-saldo in voor vouchers — nooit voor contant geld.",
    },
  };
}

function defaultsEn(): MerchantLandingContent {
  const base = defaultsNl();
  return {
    ...base,
    title: "ShopBonus for webshops",
    seo_title: "ShopBonus for webshops — more customers, pay for results",
    seo_description:
      "Make your webshop more attractive with cashback, discount codes and vouchers. You set the terms.",
    nav: {
      ...base.nav,
      links: [
        { label: "Benefits", href: "#voordelen" },
        { label: "How it works", href: "#zo-werkt-het" },
        { label: "Integrations", href: "#integraties" },
        { label: "FAQ", href: "#faq" },
      ],
      login_label: "Log in",
      cta_label: "Register webshop",
    },
    hero: {
      ...base.hero,
      eyebrow: "FOR WEBSHOPS",
      heading: "More customers. More orders.\nPay only for results.",
      subtitle:
        "Make your webshop more attractive with cashback, discount codes and vouchers. You set the terms.",
      primary_cta: { label: "Connect your webshop", href: REGISTER },
      secondary_cta: { label: "See how it works", href: "#zo-werkt-het" },
      trust: ["Set your own commission", "Connect quickly", "More visibility"],
      artwork_note: "Promotional artwork — not live results",
    },
    platforms: {
      ...base.platforms,
      heading: "Works with popular platforms",
      subtitle: "Connect your webshop with a supported integration.",
      cta_label: "View all integrations",
    },
    benefits: {
      ...base.benefits,
      eyebrow: "GROW WITH SHOPBONUS",
      heading: "Make your webshop\nirresistible.",
      description:
        "Reach new customers with attractive offers via ShopBonus. You keep control of your campaigns and commercial terms.",
      items: [
        {
          icon: "people",
          title: "Reach new customers",
          description: "Make your webshop visible to shoppers looking for deals and new stores.",
        },
        {
          icon: "tag",
          title: "Discounts and cashback",
          description:
            "Promote valid discount codes, cashback campaigns, or a combination — based on your terms.",
        },
        {
          icon: "cog",
          title: "You set the commission",
          description: "Configure your commercial agreements and keep control of your margins.",
        },
      ],
    },
    offer_preview: {
      ...base.offer_preview,
      eyebrow: "HOW YOUR OFFERS LOOK",
      heading: "Your offers.\nProfessionally presented.",
      description:
        "Your cashback campaigns and discount codes are shown clearly and attractively so shoppers can discover what your webshop offers.",
      cta_label: "View an example",
    },
    onboarding: {
      eyebrow: "IN 3 SIMPLE STEPS",
      heading: "Live in a few steps.",
      steps: [
        {
          number: "01",
          title: "Sign up",
          description: "Create an account and register your webshop.",
          icon: "document",
        },
        {
          number: "02",
          title: "Connect",
          description:
            "Connect your webshop via a supported integration or available alternative method.",
          icon: "link",
        },
        {
          number: "03",
          title: "Start with offers",
          description:
            "Set your commissions and campaigns. After approval your webshop appears on ShopBonus.",
          icon: "megaphone",
        },
      ],
    },
    bottom_cta: {
      eyebrow: "START WITH SHOPBONUS",
      heading: "Ready to reach new customers?",
      description: "Make your offers visible to deal hunters and set your own commercial terms.",
      cta_label: "Register webshop →",
      cta_href: REGISTER,
    },
    faq: {
      heading: "Frequently asked questions",
      items: [
        {
          question: "What does joining ShopBonus cost?",
          answer:
            "Joining itself is free. You only pay when there is a result under your agreed commission or campaign terms. There is no fixed subscription.",
        },
        {
          question: "How does commission work?",
          answer:
            "You set your commercial agreement. For cashback via affiliate or commission agreements the default split is 70% customer / 30% ShopBonus, unless Super Admin approves an exception. Commission is not automatically equal to the cashback the consumer sees.",
        },
        {
          question: "Can I set my own cashback campaigns?",
          answer:
            "Yes, once your webshop is approved and an eligible cashback program or merchant agreement exists. Cashback and discount codes are separate offer types.",
        },
        {
          question: "Which platforms do you support?",
          answer:
            "Including Shopify, WooCommerce, Wix and others with a connector or manual module. Status (available, manual setup or coming soon) is shown per platform — a logo alone does not mean a live connection.",
        },
        {
          question: "Can I add discount codes?",
          answer:
            "Yes. You can create or import valid discount codes. Only approved, active offers appear publicly.",
        },
        {
          question: "When does my webshop appear on ShopBonus?",
          answer:
            "After onboarding, verification and ShopBonus approval. Activation is not instant when verification is required.",
        },
        {
          question: "How are orders tracked?",
          answer:
            "Via the connected integration (webhooks or module) or an approved alternative method. Only validated, eligible orders count toward cashback calculation.",
        },
        {
          question: "Can I change my offers?",
          answer:
            "Yes. You manage commissions, cashback campaigns and discount codes from the merchant dashboard. Public display always follows approval and publication rules.",
        },
      ],
    },
    footer: {
      blurb:
        "ShopBonus helps webshops reach new customers with cashback, discount codes and vouchers. Consumers redeem wallet balance for vouchers — never cash.",
    },
  };
}

export function merchantLandingDefaults(locale: "nl" | "en" = "nl"): MerchantLandingContent {
  return locale === "en" ? defaultsEn() : defaultsNl();
}

export function mergeMerchantLandingContent(
  partial: Partial<MerchantLandingContent> | null | undefined,
  locale: "nl" | "en" = "nl"
): MerchantLandingContent {
  const base = merchantLandingDefaults(locale);
  if (!partial || typeof partial !== "object") return base;
  return {
    ...base,
    ...partial,
    nav: { ...base.nav, ...(partial.nav ?? {}) },
    hero: { ...base.hero, ...(partial.hero ?? {}) },
    platforms: {
      ...base.platforms,
      ...(partial.platforms ?? {}),
      tiles: partial.platforms?.tiles?.length ? partial.platforms.tiles : base.platforms.tiles,
    },
    benefits: {
      ...base.benefits,
      ...(partial.benefits ?? {}),
      items: partial.benefits?.items?.length ? partial.benefits.items : base.benefits.items,
    },
    offer_preview: { ...base.offer_preview, ...(partial.offer_preview ?? {}) },
    onboarding: {
      ...base.onboarding,
      ...(partial.onboarding ?? {}),
      steps: partial.onboarding?.steps?.length ? partial.onboarding.steps : base.onboarding.steps,
    },
    bottom_cta: { ...base.bottom_cta, ...(partial.bottom_cta ?? {}) },
    faq: {
      ...base.faq,
      ...(partial.faq ?? {}),
      items: partial.faq?.items?.length ? partial.faq.items : base.faq.items,
    },
    footer: { ...base.footer, ...(partial.footer ?? {}) },
    section_visibility: { ...base.section_visibility, ...(partial.section_visibility ?? {}) },
    section_order: partial.section_order?.length ? partial.section_order : base.section_order,
  };
}
