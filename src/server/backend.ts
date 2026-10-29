import "server-only";
import { NextRequest, NextResponse } from "next/server";


const authPaths = new Set(["sanctum/csrf-cookie", "login", "register", "logout", "forgot-password", "reset-password", "user/password", "user/confirm-password", "two-factor-challenge"]);

export async function forward(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  if (path.some(part => !part || part === "." || part === ".." || /[/\\?#\x00-\x20]/.test(part))) return NextResponse.json({ message: "Invalid API path." }, { status: 400 });
  const route = path.join("/");
  if (!route.startsWith("api/v1/") && route !== "api/broadcasting/auth" && !authPaths.has(route)) return NextResponse.json({ message: "Not found." }, { status: 404 });
  const mutating = !["GET", "HEAD"].includes(request.method);
  // Next.js normalizes localhost aliases in nextUrl; Host retains the browser origin.
  const frontendOrigin = request.nextUrl.protocol + "//" + request.headers.get("host");
  if (mutating && request.headers.get("origin") !== frontendOrigin) return NextResponse.json({ message: "Invalid request origin." }, { status: 403 });
  try {
    const backend = new URL(process.env.BACKEND_URL || "http://localhost:8000");
    const url = new URL(`/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`, backend);
    const headers = new Headers({ Accept: "application/json", "X-Requested-With": "XMLHttpRequest" });
    for (const key of ["cookie", "content-type", "x-xsrf-token", "idempotency-key"]) {
      const value = request.headers.get(key); if (value) headers.set(key, value);
    }
    // The browser origin is validated above before translating it for Sanctum.
    headers.set("origin", process.env.BACKEND_STATEFUL_ORIGIN || frontendOrigin);
    headers.set("referer", `${process.env.BACKEND_STATEFUL_ORIGIN || frontendOrigin}/`);
    const upstream = await fetch(url, {
      method: request.method, headers, body: mutating ? await request.arrayBuffer() : undefined,
      redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    const outgoing = new Headers({ "Cache-Control": "private, no-store" });
    for (const key of ["content-type", "content-disposition", "retry-after", "x-request-id"]) {
      const value = upstream.headers.get(key); if (value) outgoing.set(key, value);
    }
    for (const cookie of upstream.headers.getSetCookie()) outgoing.append("set-cookie", cookie.replace(/;\s*Domain=[^;]+/gi, "").replace(/;\s*Path=[^;]+/gi, "; Path=/"));
    const location = upstream.headers.get("location");
    if (location) {
      const target = new URL(location, backend);
      outgoing.set("location", target.origin === backend.origin ? `/api/backend${target.pathname}${target.search}` : target.href);
    }
    return new Response(upstream.body, { status: upstream.status, headers: outgoing });
  } catch {
    return NextResponse.json({ message: "De API is tijdelijk niet bereikbaar. Probeer het opnieuw." }, { status: 502 });
  }
}

