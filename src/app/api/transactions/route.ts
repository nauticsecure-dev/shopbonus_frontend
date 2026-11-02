import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: { code: "endpoint_retired", message: "Use the authenticated backend consumer wallet API." } },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
