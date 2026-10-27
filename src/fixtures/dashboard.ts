export type OfferStatus = "Actief" | "Gepauzeerd" | "Concept";
export type CodeStatus = "Beschikbaar" | "Uitgegeven" | "Ongeldig";

export interface MerchantOffer {
  id: string;
  title: string;
  type: "Percentage" | "Vast bedrag";
  value: string;
  minimum: string;
  maximum: string;
  validity: string;
  stock: number;
  issued: number;
  claimed: number;
  remaining: number;
  status: OfferStatus;
  condition: string;
}

export interface VoucherCode {
  id: string;
  code: string;
  status: CodeStatus;
  assigned: string;
  batch: string;
  added: string;
}

export const merchantShop = {
  name: "Woon & Co",
  initials: "W&Co",
  category: "Wonen & interieur",
  email: "sanne@woonenco.nl",
};

export const merchantOffers: MerchantOffer[] = [
  {
    id: "offer-1",
    title: "10% korting",
    type: "Percentage",
    value: "10%",
    minimum: "€ 100",
    maximum: "€ 10",
    validity: "90 dagen",
    stock: 250,
    issued: 68,
    claimed: 18,
    remaining: 12,
    status: "Actief",
    condition: "Niet combineerbaar met andere acties.",
  },
  {
    id: "offer-2",
    title: "€ 5 korting",
    type: "Vast bedrag",
    value: "€ 5",
    minimum: "€ 50",
    maximum: "—",
    validity: "60 dagen",
    stock: 386,
    issued: 42,
    claimed: 9,
    remaining: 386,
    status: "Actief",
    condition: "Geldig vanaf € 50 bestelwaarde.",
  },
  {
    id: "offer-3",
    title: "€ 25 korting",
    type: "Vast bedrag",
    value: "€ 25",
    minimum: "€ 250",
    maximum: "—",
    validity: "90 dagen",
    stock: 100,
    issued: 14,
    claimed: 4,
    remaining: 100,
    status: "Actief",
    condition: "Niet geldig op aanbiedingen.",
  },
];

export const voucherCodes: VoucherCode[] = [
  { id: "code-1", code: "WOON10-8F7A", status: "Beschikbaar", assigned: "—", batch: "Batch 1", added: "12 feb. 2026 14:22" },
  { id: "code-2", code: "WOON10-2P3K", status: "Beschikbaar", assigned: "—", batch: "Batch 1", added: "12 feb. 2026 14:22" },
  { id: "code-3", code: "WOON10-9M4D", status: "Uitgegeven", assigned: "Sanne de Vries", batch: "Batch 1", added: "11 feb. 2026 09:15" },
  { id: "code-4", code: "WOON10-K8ZA", status: "Beschikbaar", assigned: "—", batch: "Batch 2", added: "10 feb. 2026 16:03" },
  { id: "code-5", code: "WOON10-7G2L", status: "Ongeldig", assigned: "—", batch: "Batch 2", added: "10 feb. 2026 16:03" },
  { id: "code-6", code: "WOON10-R3NV", status: "Uitgegeven", assigned: "Nina Bakker", batch: "Batch 3", added: "9 feb. 2026 11:48" },
  { id: "code-7", code: "WOON10-J6T9", status: "Beschikbaar", assigned: "—", batch: "Batch 3", added: "9 feb. 2026 11:48" },
];

export const merchantNotifications = [
  {
    id: "notice-1",
    type: "warning" as const,
    title: "1 codevoorraad loopt laag",
    detail: "10% korting (nog 12 codes)",
    time: "Vandaag om 09:24",
    unread: true,
  },
  {
    id: "notice-2",
    type: "claim" as const,
    title: "2 nieuwe claims",
    detail: "Klanten hebben je vouchers geclaimd.",
    time: "Vandaag om 09:12",
    unread: true,
  },
  {
    id: "notice-3",
    type: "sale" as const,
    title: "Nieuwe bestelling via ShopBonus",
    detail: "Een klant heeft bij Woon & Co besteld.",
    time: "Gisteren om 16:48",
    unread: false,
  },
];

export const merchantClaimsByRange = {
  "7 dagen": [3, 5, 4, 6, 9, 8, 12],
  "30 dagen": [4, 6, 5, 5, 8, 12, 7, 6, 5, 9, 13, 10, 8, 6, 11, 15, 12, 8, 7, 13, 16, 12, 10, 14, 18, 15, 17, 20, 19, 24],
  "90 dagen": [9, 12, 10, 15, 13, 18, 16, 14, 22, 20, 25, 24],
};

export const adminStats = [
  { label: "Actieve webshops", value: "128", change: "+12%", icon: "store", tone: "blue" },
  { label: "Consumenten", value: "4.820", change: "+18%", icon: "users", tone: "blue" },
  { label: "Actieve vouchers", value: "2.364", change: "+9%", icon: "ticket", tone: "blue" },
  { label: "Affiliatecommissie", value: "€ 8.450", change: "+22%", icon: "coins", tone: "blue" },
  { label: "Virtueel wallettegoed", value: "€ 5.720", change: "+14%", icon: "wallet", tone: "blue" },
  { label: "Openstaande acties", value: "9", change: "+3%", icon: "list", tone: "amber" },
];

export const adminTrend = [100, 96, 124, 155, 135, 160, 178, 220, 194, 226, 201, 237, 260, 327, 299, 267, 270, 257, 290, 310, 280, 239, 261, 278, 305, 322, 350];

export const adminActivity = [
  { time: "14 apr 2025, 10:24", type: "Webshop", description: "Nieuwe webshop uitgenodigd", detail: "Woon & Co" },
  { time: "14 apr 2025, 09:12", type: "Voucher", description: "Voucher geclaimd", detail: "Sanne de Vries" },
  { time: "14 apr 2025, 08:41", type: "Affiliate", description: "Conversie geïmporteerd", detail: "Daisycon" },
  { time: "13 apr 2025, 16:37", type: "Webshop", description: "Webshop goedgekeurd", detail: "TuinPlus" },
  { time: "13 apr 2025, 14:08", type: "Support", description: "Nieuwe supportcase", detail: "Bestelling niet gelukt" },
];

export const adminActionItems = [
  { icon: "store", count: 3, title: "webshops wachten op goedkeuring", detail: "Bekijk en keur nieuwe webshops goed.", tone: "red" },
  { icon: "sync", count: 2, title: "mislukte syncs", detail: "Controleer mislukte imports van Daisycon of TradeTracker.", tone: "amber" },
  { icon: "chat", count: 4, title: "supportcases", detail: "Nieuwe of openstaande supportcases.", tone: "red" },
];
