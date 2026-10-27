import { denyUnlessDemo } from "@/server/demo";
import { NextResponse } from "next/server";
import { adminActionItems, adminActivity, adminStats, adminTrend } from "@/fixtures/dashboard";

export async function GET() {
  const denied = denyUnlessDemo();
  if (denied) return denied;
  return NextResponse.json({
    data: {
      stats: adminStats,
      voucherTrend: adminTrend,
      recentActivity: adminActivity,
      actionsRequired: adminActionItems,
      affiliateChannels: [
        { name: "Daisycon", vouchers: 1608, share: 68 },
        { name: "TradeTracker", vouchers: 756, share: 32 },
      ],
    },
    generatedAt: new Date().toISOString(),
  });
}
