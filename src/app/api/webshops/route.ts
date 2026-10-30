import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

/** Proxies to Laravel public discovery — keeps legacy /api/webshops callers working. */
export async function GET(request: NextRequest) {
  const upstream = new URL("/api/v1/public/webshops", env.apiBaseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key === "q") upstream.searchParams.set("search", value);
    else if (key === "cat") upstream.searchParams.set("category", value);
    else upstream.searchParams.set(key, value);
  });

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return NextResponse.json(
      { message: "Discovery API unreachable", data: [], meta: { total: 0 } },
      { status: 502 }
    );
  }
}
