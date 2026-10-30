import { NextResponse } from "next/server";

/**
 * Deprecated fixture BFF. The Super Admin Cockpit loads Laravel
 * `GET /api/v1/admin/cockpit` directly (cookie Sanctum).
 */
export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "gone",
        message:
          "Use GET /api/v1/admin/cockpit (and /activity, /search, /vouchers). Fixture admin metrics were removed.",
      },
    },
    { status: 410 }
  );
}
