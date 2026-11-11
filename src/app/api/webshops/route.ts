import { NextRequest, NextResponse } from "next/server";
import { env } from "@/config/env";

/** Legacy discovery alias. Laravel authenticates the forwarded caller on every request. */
export async function GET(request: NextRequest) {
  const upstream = new URL("/api/v1/public/webshops", env.apiBaseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key === "q") upstream.searchParams.set("search", value);
    else if (key === "cat") upstream.searchParams.set("category", value);
    else upstream.searchParams.set(key, value);
  });

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Accept: "application/json", Cookie: request.headers.get("cookie") ?? "", Authorization: request.headers.get("authorization") ?? "", Origin: request.nextUrl.origin },
      cache: "no-store",
    });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" },
    });
  } catch {
    return NextResponse.json(
      { message: "Discovery API unreachable", data: [], meta: { total: 0 } },
      { status: 502 }
    );
  }
}
