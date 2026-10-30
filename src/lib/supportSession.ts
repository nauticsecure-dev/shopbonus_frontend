const TOKEN_KEY = "shopbonus_support_token";
const SESSION_ID_KEY = "shopbonus_support_session_id";

export function getSupportToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function getSupportSessionId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(SESSION_ID_KEY);
}

export function setSupportSession(token: string, sessionId: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
  sessionStorage.setItem(SESSION_ID_KEY, sessionId);
}

export function clearSupportSession(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_ID_KEY);
}
