"use client";

import { useState } from "react";
import { useSession } from "@/store/SessionContext";
import { endCurrentSupportSession } from "@/lib/adminApi";
import { clearSupportSession } from "@/lib/supportSession";
import { formatApiError } from "@/lib/auth";
import { useRouter } from "next/navigation";

/**
 * Permanent indicator while a support-session Bearer token is active.
 * Target identity comes from /me; End Session clears the token and returns to admin.
 */
export default function ImpersonationBanner() {
  const { session, refresh } = useSession();
  const router = useRouter();
  const support = session?.user.support_session;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!support) return null;

  const endSession = async () => {
    setBusy(true);
    setError(null);
    try {
      await endCurrentSupportSession();
    } catch (err) {
      // Token may already be revoked — still clear local state.
      setError(formatApiError(err, "Sessie beëindigen mislukt."));
    } finally {
      clearSupportSession();
      await refresh();
      setBusy(false);
      router.push("/admin");
    }
  };

  return (
    <div
      className="sticky top-0 z-[60] border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-950"
      data-testid="impersonation-banner"
      role="status"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-extrabold">
          Impersonation Active — {session?.user.first_name || "gebruiker"} ({session?.email})
          <span className="ml-2 font-semibold text-amber-800/80">
            door {support.admin.first_name} · verloopt {new Date(support.expires_at).toLocaleString()}
          </span>
        </p>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs font-semibold text-red-700">{error}</span>}
          <button
            type="button"
            onClick={() => void endSession()}
            disabled={busy}
            className="rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-amber-950 disabled:opacity-50"
            data-testid="impersonation-end"
          >
            {busy ? "Beëindigen…" : "End Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
