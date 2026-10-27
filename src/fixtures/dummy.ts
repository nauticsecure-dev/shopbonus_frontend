export interface Offer {
  id: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount?: number;
  cost: number;
  validityDays: number;
  conditions: string[];
  codesLeft: number;
}

export interface Webshop {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  longDescription: string;
  url: string;
  category: string;
  tags: string[];
  logoText: string;
  logoBg: string;
  logoColor: string;
  banner: string;
  rating: number;
  reviews: number;
  cashback: string;
  featured?: boolean;
  offers: Offer[];
}

export interface MyVoucher {
  id: string;
  shopSlug: string;
  shopName: string;
  tagline: string;
  tags: string[];
  image: string;
  logoText: string;
  logoBg: string;
  logoColor: string;
  type: "percent" | "fixed";
  value: number;
  minOrder: number;
  maxDiscount: number;
  code: string;
  status: "active" | "expired" | "used";
  daysLeft: number;
  expiryLabel: string;
}

export interface Transaction {
  id: string;
  type: "credit" | "debit";
  title: string;
  subtitle: string;
  date: string;
  amount: number;
}

export const user = {
  firstName: "Sanne",
  lastName: "de Vries",
  fullName: "Sanne de Vries",
  email: "sanne@example.nl",
  phone: "",
  initials: "S",
  balance: 42.5,
  verified: true,
};

export interface DiscountCode {
  id: string;
  shopSlug: string;
  shopName: string;
  title: string;
  meta: string;
  code: string;
  image: string;
  badge?: string;
}

export interface PopularShop {
  slug: string;
  name: string;
  category: string;
  image: string;
  badge: string;
  badgeTone: "white" | "blue" | "green";
}

export const categories = [
  "Alle",
  "Wonen",
  "Elektronica",
  "Mode",
  "Sport",
  "Beauty",
  "Boeken",
  "Eten & Drinken",
  "Speelgoed",
];

const livingRoom =
  "https://images.pexels.com/photos/8092165/pexels-photo-8092165.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const livingRoom2 =
  "https://images.pexels.com/photos/6207822/pexels-photo-6207822.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const techImg =
  "https://images.pexels.com/photos/4006158/pexels-photo-4006158.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const techImg2 =
  "https://images.pexels.com/photos/196656/pexels-photo-196656.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const fashionImg =
  "https://images.pexels.com/photos/11911863/pexels-photo-11911863.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const fashionImg2 =
  "https://images.pexels.com/photos/1488470/pexels-photo-1488470.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const sneakersImg =
  "https://images.pexels.com/photos/28271086/pexels-photo-28271086.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const beautyImg =
  "https://images.pexels.com/photos/13534508/pexels-photo-13534508.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const officeImg =
  "https://images.pexels.com/photos/7888803/pexels-photo-7888803.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const officeImg2 =
  "https://images.pexels.com/photos/7888770/pexels-photo-7888770.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const shopperImg =
  "https://images.pexels.com/photos/6207757/pexels-photo-6207757.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const coffeeLaptop =
  "https://images.pexels.com/photos/7360/startup-photos.jpg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

const fashionRack =
  "https://images.pexels.com/photos/5706273/pexels-photo-5706273.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const beautyTowels =
  "https://images.pexels.com/photos/7796990/pexels-photo-7796990.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const sofaClose =
  "https://images.pexels.com/photos/8135275/pexels-photo-8135275.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const laptopDesk =
  "https://images.pexels.com/photos/7689876/pexels-photo-7689876.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

export const images = {
  livingRoom,
  livingRoom2,
  techImg,
  techImg2,
  fashionImg,
  fashionImg2,
  sneakersImg,
  beautyImg,
  officeImg,
  officeImg2,
  shopperImg,
  coffeeLaptop,
  fashionRack,
  beautyTowels,
  sofaClose,
  laptopDesk,
};

export const popularShops: PopularShop[] = [
  {
    slug: "woon-en-co",
    name: "Woonwinkel",
    category: "Wonen & Lifestyle",
    image: sofaClose,
    badge: "Tot 5% cashback",
    badgeTone: "white",
  },
  {
    slug: "modehuis",
    name: "Modeplein",
    category: "Mode & Kleding",
    image: fashionRack,
    badge: "€ 10 korting",
    badgeTone: "white",
  },
  {
    slug: "techwinkel",
    name: "TechStore",
    category: "Elektronica",
    image: laptopDesk,
    badge: "Nieuwe aanbiedingen",
    badgeTone: "white",
  },
  {
    slug: "beautylab",
    name: "BeautyWorld",
    category: "Verzorging & Beauty",
    image: beautyTowels,
    badge: "4% cashback",
    badgeTone: "green",
  },
];

export const discountCodes: DiscountCode[] = [
  {
    id: "dc1",
    shopSlug: "modehuis",
    shopName: "Modeplein",
    title: "15% korting op de nieuwe collectie",
    meta: "Geldig zolang de voorraad strekt · Voor alle bestellingen",
    code: "LENTE15",
    image: fashionRack,
  },
  {
    id: "dc2",
    shopSlug: "woon-en-co",
    shopName: "Woonwinkel",
    title: "€ 25 korting bij besteding vanaf € 150",
    meta: "Geldig zolang de voorraad strekt · Op geselecteerde items",
    code: "WONEN25",
    image: sofaClose,
  },
  {
    id: "dc3",
    shopSlug: "techwinkel",
    shopName: "TechStore",
    title: "€ 10 korting op laptops en tablets",
    meta: "Geldig t/m eind van de maand · Vanaf € 200",
    code: "TECH10",
    image: laptopDesk,
  },
  {
    id: "dc4",
    shopSlug: "beautylab",
    shopName: "BeautyWorld",
    title: "20% korting op skincare-sets",
    meta: "Nieuwe klanten · Eén keer te gebruiken",
    code: "GLOW20",
    image: beautyTowels,
  },
];

export const webshops: Webshop[] = [
  {
    slug: "woon-en-co",
    name: "Woon & Co",
    tagline: "Alles voor een stijlvol thuis.",
    description:
      "Alles voor een stijlvol thuis. Ontdek de nieuwste woontrends, van meubels tot woonaccessoires, bij Woon & Co.",
    longDescription:
      "Alles voor een stijlvol thuis. Van meubels en decoratie tot verlichting en woonaccessoires. Woon & Co combineert Scandinavisch design met betaalbare prijzen en gratis verzending vanaf €50.",
    url: "https://woonenco.nl",
    category: "Wonen",
    tags: ["Wonen", "Interieur", "Lifestyle"],
    logoText: "W&Co",
    logoBg: "#f6f1e8",
    logoColor: "#1a1a1a",
    banner: livingRoom,
    rating: 4.8,
    reviews: 2314,
    cashback: "Tot 4% ShopBonus",
    featured: true,
    offers: [
      {
        id: "woon-5",
        type: "fixed",
        value: 5,
        minOrder: 50,
        cost: 5,
        validityDays: 90,
        conditions: [
          "Geldig vanaf een bestelwaarde van €50.",
          "Eén voucher per bestelling.",
          "Niet combineerbaar met andere acties.",
        ],
        codesLeft: 214,
      },
      {
        id: "woon-10",
        type: "percent",
        value: 10,
        minOrder: 100,
        maxDiscount: 10,
        cost: 10,
        validityDays: 90,
        conditions: [
          "Geldig vanaf een bestelwaarde van €100.",
          "Maximale korting €10.",
          "Niet combineerbaar met andere acties.",
        ],
        codesLeft: 96,
      },
      {
        id: "woon-25",
        type: "fixed",
        value: 25,
        minOrder: 250,
        cost: 25,
        validityDays: 90,
        conditions: [
          "Geldig vanaf een bestelwaarde van €250.",
          "Eén voucher per klant.",
          "Niet geldig op aanbiedingen.",
        ],
        codesLeft: 41,
      },
    ],
  },
  {
    slug: "techwinkel",
    name: "Techwinkel",
    tagline: "Slimme tech voor een betere dag.",
    description:
      "Van laptops tot smart home: Techwinkel heeft de nieuwste gadgets met deskundig advies en snelle levering.",
    longDescription:
      "Slimme tech voor een betere dag. Ontdek laptops, audio, wearables en smart home van topmerken. Voor 23:59 besteld is morgen in huis, met 30 dagen bedenktijd.",
    url: "https://techwinkel.nl",
    category: "Elektronica",
    tags: ["Elektronica", "Computers", "Smart home"],
    logoText: "T",
    logoBg: "#0a1b3f",
    logoColor: "#ffffff",
    banner: techImg,
    rating: 4.7,
    reviews: 1892,
    cashback: "Tot 3% ShopBonus",
    featured: true,
    offers: [
      {
        id: "tech-5",
        type: "fixed",
        value: 5,
        minOrder: 50,
        cost: 5,
        validityDays: 60,
        conditions: [
          "Geldig vanaf €50 bestelwaarde.",
          "Niet geldig op Apple-producten.",
        ],
        codesLeft: 320,
      },
      {
        id: "tech-8pct",
        type: "percent",
        value: 8,
        minOrder: 150,
        maxDiscount: 20,
        cost: 12,
        validityDays: 60,
        conditions: [
          "Geldig vanaf €150 bestelwaarde.",
          "Maximale korting €20.",
        ],
        codesLeft: 150,
      },
    ],
  },
  {
    slug: "modehuis",
    name: "Modehuis",
    tagline: "De nieuwste mode, altijd met voordeel.",
    description:
      "Van tijdloze basics tot de nieuwste trends voor dames en heren. Gratis verzending en retour bij Modehuis.",
    longDescription:
      "De nieuwste mode, altijd met voordeel. Shop dames-, heren- en kindercollecties van meer dan 80 merken. Gratis verzending vanaf €75 en altijd gratis retour.",
    url: "https://modehuis.nl",
    category: "Mode",
    tags: ["Dames", "Heren", "Accessoires"],
    logoText: "M",
    logoBg: "#fdeef2",
    logoColor: "#1a1a1a",
    banner: fashionImg,
    rating: 4.6,
    reviews: 3421,
    cashback: "Tot 5% ShopBonus",
    featured: true,
    offers: [
      {
        id: "mode-15",
        type: "percent",
        value: 15,
        minOrder: 75,
        maxDiscount: 12,
        cost: 8,
        validityDays: 45,
        conditions: [
          "Geldig vanaf €75 bestelwaarde.",
          "Maximale korting €12.",
          "Niet geldig op sale.",
        ],
        codesLeft: 188,
      },
      {
        id: "mode-10",
        type: "fixed",
        value: 10,
        minOrder: 100,
        cost: 10,
        validityDays: 45,
        conditions: ["Geldig vanaf €100 bestelwaarde."],
        codesLeft: 260,
      },
    ],
  },
  {
    slug: "sportpro",
    name: "SportPro",
    tagline: "Alles voor jouw sport.",
    description:
      "Hardlopen, fitness, voetbal en meer. SportPro heeft topmerken voor elke sporter, van beginner tot pro.",
    longDescription:
      "Alles voor jouw sport. Van hardloopschoenen tot fitnessapparatuur: SportPro levert alles van Nike, Adidas, Puma en meer. Gratis verzending vanaf €40.",
    url: "https://sportpro.nl",
    category: "Sport",
    tags: ["Hardlopen", "Fitness", "Voetbal"],
    logoText: "S",
    logoBg: "#e8f9ee",
    logoColor: "#0a7a3d",
    banner: sneakersImg,
    rating: 4.7,
    reviews: 1204,
    cashback: "Tot 4% ShopBonus",
    offers: [
      {
        id: "sport-10",
        type: "percent",
        value: 10,
        minOrder: 60,
        maxDiscount: 15,
        cost: 7,
        validityDays: 60,
        conditions: ["Geldig vanaf €60 bestelwaarde.", "Maximale korting €15."],
        codesLeft: 143,
      },
    ],
  },
  {
    slug: "beautylab",
    name: "BeautyLab",
    tagline: "Stralend jezelf, elke dag.",
    description:
      "Skincare, make-up en parfum van de beste merken. Persoonlijk advies van beauty-experts bij BeautyLab.",
    longDescription:
      "Stralend jezelf, elke dag. Ontdek skincare, haarverzorging en parfum van CeraVe, The Ordinary, Rituals en meer. Gratis samples bij elke bestelling.",
    url: "https://beautylab.nl",
    category: "Beauty",
    tags: ["Skincare", "Make-up", "Parfum"],
    logoText: "B",
    logoBg: "#f3e9ff",
    logoColor: "#6b21a8",
    banner: beautyImg,
    rating: 4.9,
    reviews: 987,
    cashback: "Tot 6% ShopBonus",
    offers: [
      {
        id: "beauty-20",
        type: "percent",
        value: 20,
        minOrder: 40,
        maxDiscount: 10,
        cost: 6,
        validityDays: 30,
        conditions: ["Geldig vanaf €40 bestelwaarde.", "Maximale korting €10."],
        codesLeft: 210,
      },
      {
        id: "beauty-5",
        type: "fixed",
        value: 5,
        minOrder: 30,
        cost: 4,
        validityDays: 30,
        conditions: ["Geldig vanaf €30 bestelwaarde."],
        codesLeft: 402,
      },
    ],
  },
  {
    slug: "boekenhoek",
    name: "Boekenhoek",
    tagline: "Verdwaal in een goed boek.",
    description:
      "Meer dan 100.000 boeken, e-books en luisterboeken. Voor 22:00 besteld, morgen in huis.",
    longDescription:
      "Verdwaal in een goed boek. Romans, thrillers, kinderboeken en studieboeken: Boekenhoek heeft het allemaal. Gratis verzending vanaf €20.",
    url: "https://boekenhoek.nl",
    category: "Boeken",
    tags: ["Boeken", "E-books", "Kinderboeken"],
    logoText: "B",
    logoBg: "#fff4e0",
    logoColor: "#9a5b00",
    banner: coffeeLaptop,
    rating: 4.8,
    reviews: 764,
    cashback: "Tot 3% ShopBonus",
    offers: [
      {
        id: "boek-5",
        type: "fixed",
        value: 5,
        minOrder: 25,
        cost: 4,
        validityDays: 90,
        conditions: ["Geldig vanaf €25 bestelwaarde."],
        codesLeft: 512,
      },
    ],
  },
  {
    slug: "smaakmarkt",
    name: "Smaakmarkt",
    tagline: "Verse boodschappen aan huis.",
    description:
      "Verse groenten, ambachtelijke kaas en wereldse smaken. Bezorgd wanneer het jou uitkomt.",
    longDescription:
      "Verse boodschappen aan huis. Smaakmarkt brengt de markt naar je deur: vers, lokaal en duurzaam. Gratis bezorging vanaf €50.",
    url: "https://smaakmarkt.nl",
    category: "Eten & Drinken",
    tags: ["Vers", "Biologisch", "Delicatessen"],
    logoText: "Sm",
    logoBg: "#e6f7ec",
    logoColor: "#166534",
    banner: livingRoom2,
    rating: 4.5,
    reviews: 543,
    cashback: "Tot 2% ShopBonus",
    offers: [
      {
        id: "smaak-7",
        type: "percent",
        value: 7,
        minOrder: 50,
        maxDiscount: 8,
        cost: 5,
        validityDays: 30,
        conditions: ["Geldig vanaf €50 bestelwaarde.", "Maximale korting €8."],
        codesLeft: 98,
      },
    ],
  },
  {
    slug: "speelparadijs",
    name: "Speelparadijs",
    tagline: "Spelen is leren.",
    description:
      "Speelgoed voor alle leeftijden: van LEGO tot buitenspeelgoed. Altijd scherp geprijsd.",
    longDescription:
      "Spelen is leren. Van LEGO en Playmobil tot buitenspeelgoed en puzzels: Speelparadijs heeft het leukste speelgoed voor elke leeftijd.",
    url: "https://speelparadijs.nl",
    category: "Speelgoed",
    tags: ["LEGO", "Buiten", "Puzzels"],
    logoText: "Sp",
    logoBg: "#e0f2ff",
    logoColor: "#0369a1",
    banner: techImg2,
    rating: 4.6,
    reviews: 689,
    cashback: "Tot 3% ShopBonus",
    offers: [
      {
        id: "speel-10",
        type: "percent",
        value: 10,
        minOrder: 40,
        maxDiscount: 10,
        cost: 5,
        validityDays: 60,
        conditions: ["Geldig vanaf €40 bestelwaarde.", "Maximale korting €10."],
        codesLeft: 175,
      },
    ],
  },
];

export const myVouchers: MyVoucher[] = [
  {
    id: "v1",
    shopSlug: "woon-en-co",
    shopName: "Woon & Co",
    tagline: "Alles voor een stijlvol thuis.",
    tags: ["Wonen", "Interieur", "Lifestyle"],
    image: livingRoom,
    logoText: "W&Co",
    logoBg: "#f6f1e8",
    logoColor: "#1a1a1a",
    type: "percent",
    value: 10,
    minOrder: 100,
    maxDiscount: 10,
    code: "WOON10-8F7A",
    status: "active",
    daysLeft: 75,
    expiryLabel: "t/m 6 jan 2027",
  },
  {
    id: "v2",
    shopSlug: "techwinkel",
    shopName: "Techwinkel",
    tagline: "Slimme tech voor een betere dag.",
    tags: ["Elektronica", "Computers", "Smart home"],
    image: techImg,
    logoText: "T",
    logoBg: "#0a1b3f",
    logoColor: "#ffffff",
    type: "fixed",
    value: 5,
    minOrder: 50,
    maxDiscount: 5,
    code: "TECH5-K3P9",
    status: "active",
    daysLeft: 32,
    expiryLabel: "t/m 24 nov 2026",
  },
  {
    id: "v3",
    shopSlug: "modehuis",
    shopName: "Modehuis",
    tagline: "De nieuwste mode, altijd met voordeel.",
    tags: ["Dames", "Heren", "Accessoires"],
    image: fashionImg,
    logoText: "M",
    logoBg: "#fdeef2",
    logoColor: "#1a1a1a",
    type: "percent",
    value: 15,
    minOrder: 75,
    maxDiscount: 12,
    code: "MODE15-9X2Q",
    status: "expired",
    daysLeft: 0,
    expiryLabel: "Verlopen op 02 feb 2026",
  },
];

export const transactions: Transaction[] = [
  {
    id: "t1",
    type: "credit",
    title: "ShopBonus ontvangen",
    subtitle: "Bol.com aankoop",
    date: "12 okt 2026",
    amount: 8.5,
  },
  {
    id: "t2",
    type: "credit",
    title: "ShopBonus ontvangen",
    subtitle: "Booking.com aankoop",
    date: "5 okt 2026",
    amount: 4.25,
  },
  {
    id: "t3",
    type: "debit",
    title: "Voucher gebruikt",
    subtitle: "Woon & Co",
    date: "2 okt 2026",
    amount: 10.0,
  },
  {
    id: "t4",
    type: "credit",
    title: "ShopBonus ontvangen",
    subtitle: "Techwinkel aankoop",
    date: "28 sep 2026",
    amount: 6.4,
  },
  {
    id: "t5",
    type: "debit",
    title: "Voucher gebruikt",
    subtitle: "Techwinkel",
    date: "20 sep 2026",
    amount: 5.0,
  },
  {
    id: "t6",
    type: "credit",
    title: "ShopBonus ontvangen",
    subtitle: "Modehuis aankoop",
    date: "14 sep 2026",
    amount: 3.75,
  },
  {
    id: "t7",
    type: "credit",
    title: "Welkomstbonus",
    subtitle: "Account aangemaakt",
    date: "1 sep 2026",
    amount: 5.0,
  },
];

export function formatEuro(n: number): string {
  return (
    "€" +
    n.toLocaleString("nl-NL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function offerTitle(o: { type: string; value: number }): string {
  return o.type === "percent" ? `${o.value}% korting` : `€${o.value} korting`;
}

export function offerSubtitle(o: {
  minOrder: number;
  maxDiscount?: number;
}): string {
  if (o.maxDiscount) return `Vanaf €${o.minOrder} • Maximaal €${o.maxDiscount}`;
  return `Vanaf €${o.minOrder}`;
}
