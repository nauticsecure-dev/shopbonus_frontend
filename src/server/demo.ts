import "server-only";

// This enables public fixtures only. It is not an authentication mechanism.
export function isDemoEnabled() {
  return process.env.NODE_ENV === "development" || process.env.ENABLE_DEMO_MODE === "true";
}
export function denyUnlessDemo() {
  if (isDemoEnabled()) return null;
  return Response.json(
    { error: "Demo endpoint disabled" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}
