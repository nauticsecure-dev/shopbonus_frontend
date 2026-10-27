import { NextResponse } from "next/server";
import { webshops } from "@/fixtures/dummy";

export async function GET() {
  return NextResponse.json({ data: webshops, total: webshops.length });
}
