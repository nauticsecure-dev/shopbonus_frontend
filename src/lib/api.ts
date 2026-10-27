export const apiPath = (path: string) => `/api/backend${path.startsWith("/") ? path : `/api/v1/${path}`}`;
export class ApiError extends Error {
  constructor(message: string, public status: number, public fields: Record<string, string[]> = {}, public requestId?: string) { super(message); }
}
export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = await fetch(apiPath("/sanctum/csrf-cookie"), { credentials: "same-origin", cache: "no-store" });
    if (!csrf.ok) throw new ApiError("Beveiligde sessie kon niet worden gestart.", csrf.status);
    const token = document.cookie.split("; ").find(c => c.startsWith("XSRF-TOKEN="))?.slice(11);
    if (token) headers.set("X-XSRF-TOKEN", decodeURIComponent(token));
  }
  const response = await fetch(apiPath(path), { ...options, method, headers, credentials: "same-origin", cache: "no-store" });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    const fields = error?.fields || payload?.errors || {};
    throw new ApiError(Object.values(fields).flat().join(" ") || error?.message || payload?.message || `Aanvraag mislukt (${response.status}).`, response.status, fields, error?.request_id);
  }
  return payload as T;
}
export function mutate<T = unknown>(path: string, body: unknown = {}, method = "POST", headers?: HeadersInit) {
  return api<T>(path, { method, headers, body: JSON.stringify(body) });
}
