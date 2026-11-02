"use client";

import { apiUrl, env } from "@/config/env";
import { ensureCsrfCookie } from "@/lib/api";

type EchoLike = {
  private: (channel: string) => {
    listen: (event: string, cb: (payload: unknown) => void) => unknown;
    stopListening: (event?: string) => unknown;
    subscribed?: (cb: () => void) => unknown;
    error?: (cb: () => void) => unknown;
  };
  leave: (channel: string) => void;
  disconnect: () => void;
};

let echoInstance: EchoLike | null = null;
let echoPromise: Promise<EchoLike | null> | null = null;

function reverbConfigured(): boolean {
  return Boolean(env.reverbKey && env.reverbHost);
}

/**
 * Lazy Echo client for Laravel Reverb. Returns null when public Reverb env is unset
 * so the UI still works via HTTP refresh alone.
 */
export async function getEcho(): Promise<EchoLike | null> {
  if (!reverbConfigured() || typeof window === "undefined") return null;
  if (echoInstance) return echoInstance;
  if (echoPromise) return echoPromise;

  echoPromise = (async () => {
    try {
      const [{ default: Echo }, { default: Pusher }] = await Promise.all([
        import("laravel-echo"),
        import("pusher-js"),
      ]);
      (window as unknown as { Pusher: typeof Pusher }).Pusher = Pusher;

      await ensureCsrfCookie();

      const xsrfMatch = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
      const xsrf = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : "";

      echoInstance = new Echo({
        broadcaster: "reverb",
        key: env.reverbKey,
        wsHost: env.reverbHost,
        wsPort: env.reverbPort,
        wssPort: env.reverbPort,
        forceTLS: env.reverbScheme === "https",
        enabledTransports: ["ws", "wss"],
        authEndpoint: apiUrl("/api/broadcasting/auth"),
        auth: {
          headers: {
            Accept: "application/json",
            ...(xsrf ? { "X-XSRF-TOKEN": xsrf } : {}),
          },
        },
        withCredentials: true,
      }) as unknown as EchoLike;

      return echoInstance;
    } catch {
      echoInstance = null;
      return null;
    }
  })();

  return echoPromise;
}

export function walletChannelName(userPublicId: string): string {
  return `shopbonus.user.${userPublicId}.wallet`;
}

type WalletSubscriptionOptions = {
  onInvalidate: (reason?: string) => void;
  /** Called after the websocket recovers so clients can re-fetch authoritative HTTP state. */
  onReconnect?: () => void;
};

export async function subscribeWalletInvalidation(
  userPublicId: string,
  onInvalidateOrOptions: ((reason?: string) => void) | WalletSubscriptionOptions
): Promise<() => void> {
  const options: WalletSubscriptionOptions =
    typeof onInvalidateOrOptions === "function"
      ? { onInvalidate: onInvalidateOrOptions }
      : onInvalidateOrOptions;

  const echo = await getEcho();
  if (!echo) return () => undefined;

  const name = walletChannelName(userPublicId);
  const channel = echo.private(name);
  const handler = (payload: unknown) => {
    const reason =
      payload && typeof payload === "object" && "reason" in payload
        ? String((payload as { reason?: unknown }).reason ?? "")
        : undefined;
    options.onInvalidate(reason || undefined);
  };
  channel.listen(".WalletBalanceChanged", handler);
  channel.listen("WalletBalanceChanged", handler);

  // Recover missed events after a transport drop while the tab stays focused.
  let sawDisconnect = false;
  const connector = (echo as unknown as { connector?: { pusher?: { connection?: {
    bind: (event: string, cb: (states: { previous: string; current: string }) => void) => void;
    unbind: (event: string, cb?: (states: { previous: string; current: string }) => void) => void;
  } } } }).connector;
  const connection = connector?.pusher?.connection;
  const onStateChange = (states: { previous: string; current: string }) => {
    if (states.current === "disconnected" || states.current === "unavailable" || states.current === "failed") {
      sawDisconnect = true;
      return;
    }
    if (states.current === "connected" && sawDisconnect) {
      sawDisconnect = false;
      options.onReconnect?.();
    }
  };
  connection?.bind("state_change", onStateChange);

  return () => {
    try {
      connection?.unbind("state_change", onStateChange);
      channel.stopListening(".WalletBalanceChanged");
      channel.stopListening("WalletBalanceChanged");
      echo.leave(name);
    } catch {
      /* ignore */
    }
  };
}

export type SupportProgressPayload = {
  conversation_id?: string;
  message_id?: string;
  status?: string;
  event?: string;
};

export function supportConversationChannelName(conversationId: string): string {
  return `shopbonus.support.conversation.${conversationId}`;
}

const SUPPORT_EVENTS = [
  "ChatResearchStarted",
  "ChatVerificationStarted",
  "ChatRetryStarted",
  "ChatAnswerVerified",
  "ChatAnswerUnavailable",
  "ChatFeedbackSubmitted",
  "ChatReviewRequired",
  "ChatSupportReplyAvailable",
] as const;

/**
 * Subscribe to authorized private support conversation progress.
 * Returns a no-op disposer when Reverb is unavailable (HTTP fallback remains).
 */
export type OrderSheetUpdatePayload = {
  order_id?: string;
  payment_status?: string;
};

export function orderSheetChannelName(webshopPublicId: string): string {
  return `webshops.${webshopPublicId}.orders`;
}

/**
 * Live Order Sheet signal. Payload is PII-free; callers must refetch via the API.
 * Returns a no-op disposer when Reverb is unavailable (HTTP polling remains).
 */
export async function subscribeOrderSheet(
  webshopPublicId: string,
  onUpdate: (payload: OrderSheetUpdatePayload) => void
): Promise<() => void> {
  const echo = await getEcho();
  if (!echo || !webshopPublicId) return () => undefined;

  const name = orderSheetChannelName(webshopPublicId);
  const channel = echo.private(name);
  const handler = (payload: unknown) => {
    const data =
      payload && typeof payload === "object" ? (payload as OrderSheetUpdatePayload) : {};
    onUpdate(data);
  };
  channel.listen(".order.updated", handler);
  channel.listen("order.updated", handler);

  return () => {
    try {
      channel.stopListening(".order.updated");
      channel.stopListening("order.updated");
      echo.leave(name);
    } catch {
      /* ignore */
    }
  };
}

export type NotificationInboxEvent =
  | "NotificationCreated"
  | "NotificationRead"
  | "NotificationReadAll"
  | "NotificationCountUpdated";

export type NotificationInboxPayload = {
  notification_id?: string | null;
};

export function notificationChannelName(userPublicId: string): string {
  return `shopbonus.user.${userPublicId}.notifications`;
}

const NOTIFICATION_EVENTS: NotificationInboxEvent[] = [
  "NotificationCreated",
  "NotificationRead",
  "NotificationReadAll",
  "NotificationCountUpdated",
];

/**
 * Subscribe to private notification invalidation events.
 * Payload is intentionally minimal — callers must refetch via HTTP.
 */
export async function subscribeNotifications(
  userPublicId: string,
  onEvent: (event: NotificationInboxEvent, payload: NotificationInboxPayload) => void
): Promise<() => void> {
  const echo = await getEcho();
  if (!echo || !userPublicId) return () => undefined;

  const name = notificationChannelName(userPublicId);
  const channel = echo.private(name);
  const cleaners: Array<() => void> = [];

  for (const eventName of NOTIFICATION_EVENTS) {
    const handler = (payload: unknown) => {
      const data =
        payload && typeof payload === "object" ? (payload as NotificationInboxPayload) : {};
      onEvent(eventName, data);
    };
    channel.listen(`.${eventName}`, handler);
    channel.listen(eventName, handler);
    cleaners.push(() => {
      try {
        channel.stopListening(`.${eventName}`);
        channel.stopListening(eventName);
      } catch {
        /* ignore */
      }
    });
  }

  return () => {
    cleaners.forEach((fn) => fn());
    try {
      echo.leave(name);
    } catch {
      /* ignore */
    }
  };
}

export async function subscribeSupportConversation(
  conversationId: string,
  onEvent: (event: string, payload: SupportProgressPayload) => void,
  onConnection?: (connected: boolean) => void
): Promise<() => void> {
  const echo = await getEcho();
  if (!echo || !conversationId) return () => undefined;

  onConnection?.(false);
  const name = supportConversationChannelName(conversationId);
  const channel = echo.private(name);
  let active = true;
  channel.subscribed?.(() => { if (active) onConnection?.(true); });
  const connection = (echo as unknown as { connector?: { pusher?: { connection?: {
    bind: (event: string, cb: (states: { current: string }) => void) => void;
    unbind: (event: string, cb: (states: { current: string }) => void) => void;
  } } } }).connector?.pusher?.connection;
  const onState = (states: { current: string }) => {
    if (active && states.current !== "connected") onConnection?.(false);
    // Subscription acknowledgement confirms authorization after reconnect.
  };
  connection?.bind("state_change", onState);
  channel.error?.(() => onConnection?.(false));
  const cleaners: Array<() => void> = [];

  for (const eventName of SUPPORT_EVENTS) {
    const handler = (payload: unknown) => {
      const data =
        payload && typeof payload === "object" ? (payload as SupportProgressPayload) : {};
      onEvent(eventName, data);
    };
    channel.listen(`.${eventName}`, handler);
    channel.listen(eventName, handler);
    cleaners.push(() => {
      try {
        channel.stopListening(`.${eventName}`);
        channel.stopListening(eventName);
      } catch {
        /* ignore */
      }
    });
  }

  return () => {
    active = false;
    connection?.unbind("state_change", onState);
    cleaners.forEach((fn) => fn());
    try {
      echo.leave(name);
    } catch {
      /* ignore */
    }
  };
}
