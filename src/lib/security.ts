/** Client-safe input helpers. Server secrets never belong in the browser. */

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/** Strip control characters and trim; does not claim HTML-safety for rich text. */
export function sanitizePlainText(input: string, maxLength = 500): string {
  return input.replace(CONTROL_CHARS, "").trim().slice(0, maxLength);
}

/** Basic email shape check before sending to the API. */
export function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

/** Password policy aligned with Laravel Password::defaults (min 10 + letters + numbers). */
export function isStrongEnoughPassword(value: string): boolean {
  return value.length >= 10 && value.length <= 128 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

/** Prevent open redirects to external hosts from query params. */
export function safeInternalPath(path: string | null | undefined, fallback = "/"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  return path;
}
