import { denyUnlessDemo } from "@/server/demo";
import { NextResponse } from "next/server";
import { transactions, user } from "@/fixtures/dummy";

export async function GET() {
  const denied = denyUnlessDemo();
  if (denied) return denied;
  return NextResponse.json({
    data: transactions,
    balance: user.balance,
    total: transactions.length,
  });
}
