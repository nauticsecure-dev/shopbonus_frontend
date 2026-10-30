import { NextResponse } from "next/server";

/**
 * Deprecated fixture BFF. The merchant overview loads Laravel
 * `GET /api/v1/workspaces/{id}/dashboard` directly (cookie Sanctum).
 */
export async function GET() {
  return NextResponse.json(
    {
      error: {
        code: "gone",
        message:
          "Use GET /api/v1/workspaces/{workspace}/dashboard. Fixture merchant metrics were removed.",
      },
    },
    { status: 410 }
  );
}
