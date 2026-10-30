import { NextResponse } from "next/server";
import { myVouchers } from "@/data/dummy";

export async function GET() {
  return NextResponse.json({ data: myVouchers, total: myVouchers.length });
}
