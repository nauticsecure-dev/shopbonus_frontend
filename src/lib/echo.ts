"use client";

type WalletListener = (payload: { reason?: string }) => void;

/**
 * Lightweight Reverb/Pusher private-channel client for wallet invalidation.
 * Re-fetches remain the source of truth; events are never financial proof.
 */
export function subscribeWalletChannel(userPublicId: string, onEvent: WalletListener): () => void {
  if (typeof window === "undefined") return () => undefined;

  const key = process.env.NEXT_PUBLIC_REVERB_APP_KEY;
  const host = process.env.NEXT_PUBLIC_REVERB_HOST;
  if (!key || !host) {
    // No realtime configured: fall back to visibility-based refresh only.
    const onFocus = () => onEvent({ reason: "focus" });
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") onEvent({ reason: "visible" });
    });
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }

  let socket: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: number | undefined;
  const port = process.env.NEXT_PUBLIC_REVERB_PORT || "8080";
  const scheme = process.env.NEXT_PUBLIC_REVERB_SCHEME === "https" ? "wss" : "ws";
  const channel = `private-shopbonus.user.${userPublicId}.wallet`;

  async function auth(socketId: string) {
    const csrf = document.cookie.split("; ").find((c) => c.startsWith("XSRF-TOKEN="))?.slice(11);
    const res = await fetch("/api/backend/api/broadcasting/auth", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(csrf ? { "X-XSRF-TOKEN": decodeURIComponent(csrf) } : {}),
      },
      body: JSON.stringify({ socket_id: socketId, channel_name: channel }),
    });
    if (!res.ok) throw new Error("broadcast auth failed");
    return res.json() as Promise<{ auth: string }>;
  }

  function connect() {
    if (closed) return;
    socket = new WebSocket(`${scheme}://${host}:${port}/app/${key}?protocol=7&client=js&version=8.4.0&flash=false`);
    socket.onmessage = async (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as { event?: string; data?: string | Record<string, unknown> };
        if (msg.event === "pusher:connection_established") {
          const data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
          const socketId = String((data as { socket_id?: string })?.socket_id || "");
          const { auth: signature } = await auth(socketId);
          socket?.send(JSON.stringify({ event: "pusher:subscribe", data: { channel, auth: signature } }));
          return;
        }
        if (msg.event === "WalletBalanceChanged" || msg.event === "client-WalletBalanceChanged") {
          onEvent(typeof msg.data === "string" ? JSON.parse(msg.data) : (msg.data as { reason?: string }) || {});
        }
      } catch {
        /* ignore malformed frames */
      }
    };
    socket.onclose = () => {
      if (closed) return;
      reconnectTimer = window.setTimeout(connect, 2500);
    };
  }

  connect();
  const onFocus = () => onEvent({ reason: "focus" });
  window.addEventListener("focus", onFocus);

  return () => {
    closed = true;
    window.removeEventListener("focus", onFocus);
    if (reconnectTimer) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
