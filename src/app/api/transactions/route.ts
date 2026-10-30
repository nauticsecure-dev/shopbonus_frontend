import { NextResponse } from "next/server";
import { transactions, user } from "@/data/dummy";

export async function GET() {
  return NextResponse.json({
    data: transactions,
    balance: user.balance,
    total: transactions.length,
  });
}
