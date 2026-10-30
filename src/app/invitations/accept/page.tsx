"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/Cards";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { formatApiError } from "@/lib/auth";
import {
  ApiError,
  acceptInvitation,
  previewInvitation,
  type InvitationPreview,
} from "@/lib/workspaceCompliance";

const TOKEN_STORAGE_KEY = "shopbonus.invitation_token";

function readTokenFromHash(): string {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash.replace(/^#/, "");
  const params = new URLSearchParams(hash.includes("=") ? hash : `token=${hash}`);
  const fromHash = (params.get("token") || (hash && !hash.includes("=") ? hash : "") || "").trim();
  if (fromHash) {
    try {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, fromHash);
    } catch {
      /* ignore */
    }
    return fromHash;
  }
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export default function AcceptInvitationPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[70vh] place-items-center text-muted" role="status">
          Uitnodiging laden…
        </div>
      }
    >
      <AcceptInvitationInner />
    </Suspense>
  );
}

function AcceptInvitationInner() {
  const router = useRouter();
  const { session, ready, refresh } = useSession();
  const { pushToast } = useShopBonus();
  const [token, setToken] = useState("");
  const [preview, setPreview] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const t = readTokenFromHash();
    setToken(t);
    if (!t) {
      setError("Geen uitnodigingstoken gevonden in de link.");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await previewInvitation(t);
        if (!cancelled) setPreview(data);
      } catch (err) {
        if (!cancelled) {
          setError(formatApiError(err, "Deze uitnodiging is ongeldig, verlopen of al gebruikt."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loginHref = useMemo(() => {
    const next = `/invitations/accept`;
    return `/account?mode=login&next=${encodeURIComponent(next)}`;
  }, []);

  const onAccept = async () => {
    if (!token) return;
    if (!session?.user) {
      // Preserve token in hash across login redirect.
      if (typeof window !== "undefined" && !window.location.hash) {
        window.location.hash = `token=${encodeURIComponent(token)}`;
      }
      router.push(loginHref);
      return;
    }
    setAccepting(true);
    try {
      const workspace = await acceptInvitation(token);
      try {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      await refresh();
      pushToast({
        title: "Uitnodiging geaccepteerd",
        message: `Je hebt nu toegang tot ${workspace.name}.`,
        kind: "success",
      });
      router.replace(workspace.status === "approved" ? "/dashboard" : "/onboarding");
    } catch (err) {
      const message = formatApiError(err, "Acceptatie mislukt.");
      setError(message);
      pushToast({ title: "Acceptatie mislukt", message, kind: "error" });
      if (err instanceof ApiError && (err.status === 401 || err.code === "unauthenticated")) {
        router.push(loginHref);
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#f4f8ff_0%,#eef6ff_52%,#f8fbff_100%)]">
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Eyebrow>Teamuitnodiging</Eyebrow>
        <h1 className="mt-3 text-3xl font-black text-navy">Workspace-toegang</h1>
        <p className="mt-2 text-sm text-muted">
          Accepteer een beveiligde, eenmalige uitnodiging. Tokens die verlopen, hergebruikt of niet bij jou horen, worden geweigerd.
        </p>

        <div className="mt-8 rounded-3xl border border-blue-100 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(11,116,255,0.35)]">
          {loading && <p className="text-sm text-muted">Uitnodiging controleren…</p>}
          {!loading && error && (
            <div className="space-y-4">
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
              <Link href="/account?mode=login" className="text-sm font-extrabold text-brand hover:underline">
                Naar account
              </Link>
            </div>
          )}
          {!loading && preview && !error && (
            <div className="space-y-4">
              <p className="text-sm text-navy">
                <span className="font-extrabold">{preview.invited_by}</span> nodigt je uit voor{" "}
                <span className="font-extrabold">{preview.webshop.name}</span> als{" "}
                <span className="font-extrabold">{preview.role}</span>.
              </p>
              <p className="text-xs text-muted">
                Bestemd voor {preview.email_hint}. Verloopt{" "}
                {new Date(preview.expires_at).toLocaleString("nl-NL")}.
              </p>
              {!ready ? (
                <p className="text-sm text-muted">Sessie laden…</p>
              ) : !session?.user ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted">Log in of registreer met het uitgenodigde e-mailadres.</p>
                  <Link
                    href={loginHref}
                    className="inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white"
                  >
                    Inloggen om te accepteren
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={accepting}
                  onClick={() => void onAccept()}
                  className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60"
                >
                  {accepting ? "Bezig…" : "Uitnodiging accepteren"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
