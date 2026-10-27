import { denyUnlessDemo } from "@/server/demo";
import { NextResponse } from "next/server";
import { myVouchers } from "@/fixtures/dummy";

export async function GET() {
  const denied = denyUnlessDemo();
  if (denied) return denied;
  return NextResponse.json({ data: myVouchers, total: myVouchers.length });
}
