import { denyUnlessDemo } from "@/server/demo";
import { NextResponse } from "next/server";
import { merchantNotifications, merchantOffers } from "@/fixtures/dashboard";

export async function GET() {
  const denied = denyUnlessDemo();
  if (denied) return denied;
  const activeOffers = merchantOffers.filter((offer) => offer.status === "Actief").length;
  const availableCodes = merchantOffers.reduce((sum, offer) => sum + offer.stock, 0);
  const issuedVouchers = merchantOffers.reduce((sum, offer) => sum + offer.issued, 0);
  const claimedVouchers = merchantOffers.reduce((sum, offer) => sum + offer.claimed, 0);

  return NextResponse.json({
    data: {
      shop: { name: "Woon & Co", category: "Wonen & interieur" },
      metrics: { activeOffers, availableCodes, issuedVouchers, claimedVouchers },
      offers: merchantOffers,
      notifications: merchantNotifications,
    },
    generatedAt: new Date().toISOString(),
  });
}
