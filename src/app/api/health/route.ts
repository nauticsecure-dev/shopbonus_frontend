import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!process.env.DATABASE_URL) return Response.json({ ok: false }, { status: 503, headers });
  try {
    const { db } = await import("@/server/db");
    await db.execute(sql`select 1`);
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json({ ok: false }, { status: 503, headers });
  }
}
