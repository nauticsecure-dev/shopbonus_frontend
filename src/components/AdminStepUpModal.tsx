"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { confirmPassword, requestStepUpCode, verifyStepUpCode } from "@/lib/adminApi";
import { formatApiError } from "@/lib/auth";

type Step = "password" | "otp" | "running";

export type AdminStepUpModalProps = {
  open: boolean;
  title: string;
  description?: string;
  /** When true (default), require emailed OTP after password confirmation. */
  requireOtp?: boolean;
  confirmLabel?: string;
  onClose: () => void;
  /** Runs after password (+ OTP when required). Throw ApiError to surface failure. */
  onReady: () => Promise<void>;
};

/**
 * Shared Super Admin step-up: Fortify confirm-password, then optional emailed OTP.
 * Use before approve/suspend, wallet adjustments, retries, support sessions, publish, audit export.
 */
export default function AdminStepUpModal({
  open,
  title,
  description,
  requireOtp = true,
  confirmLabel = "Bevestigen",
  onClose,
  onReady,
}: AdminStepUpModalProps) {
  const [step, setStep] = useState<Step>("password");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("password");
    setPassword("");
    setCode("");
    setError(null);
    setBusy(false);
    setExpiresAt(null);
  }, [open]);

  const runAction = useCallback(async () => {
    setStep("running");
    setBusy(true);
    setError(null);
    try {
      await onReady();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.code === "password_confirmation_required") {
        setStep("password");
        setError("Wachtwoord opnieuw bevestigen.");
      } else if (err instanceof ApiError && err.code === "step_up_code_required") {
        setStep("otp");
        setError("E-mailcode vereist. Vraag een nieuwe code aan.");
      } else {
        setStep(requireOtp ? "otp" : "password");
        setError(formatApiError(err, "Actie mislukt."));
      }
    } finally {
      setBusy(false);
    }
  }, [onReady, onClose, requireOtp]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await confirmPassword(password);
      if (requireOtp) {
        const sent = await requestStepUpCode();
        setExpiresAt(sent.expires_at);
        setStep("otp");
      } else {
        await runAction();
      }
    } catch (err) {
      setError(formatApiError(err, "Wachtwoord bevestigen mislukt."));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyStepUpCode(code.replace(/\s/g, ""));
      await runAction();
    } catch (err) {
      setError(formatApiError(err, "Code ongeldig."));
      setBusy(false);
    }
  };

  const resendCode = async () => {
    setBusy(true);
    setError(null);
    try {
      const sent = await requestStepUpCode();
      setExpiresAt(sent.expires_at);
    } catch (err) {
      setError(formatApiError(err, "Code verzenden mislukt."));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-navy/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-stepup-title"
      data-testid="admin-stepup-modal"
    >
      <div className="w-full max-w-md rounded-2xl border border-blue-100 bg-white p-5 shadow-2xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 id="admin-stepup-title" className="text-lg font-black text-navy">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy && step === "running"}
            className="rounded-lg px-2 py-1 text-sm font-bold text-muted hover:bg-slate-50"
            aria-label="Sluiten"
          >
            ✕
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        )}

        {step === "password" && (
          <form onSubmit={(e) => void submitPassword(e)} className="space-y-3">
            <label className="block text-sm font-bold text-navy">
              Wachtwoord
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2.5 text-sm outline-none focus:border-brand"
                data-testid="admin-stepup-password"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !password}
              className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
            >
              {requireOtp ? "Doorgaan naar e-mailcode" : confirmLabel}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={(e) => void submitOtp(e)} className="space-y-3">
            <p className="text-sm text-muted">
              Voer de 6-cijferige code in die naar je e-mail is gestuurd.
              {expiresAt ? ` Geldig tot ${new Date(expiresAt).toLocaleTimeString()}.` : ""}
            </p>
            <label className="block text-sm font-bold text-navy">
              Code
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                className="mt-1 w-full rounded-xl border border-blue-100 px-3 py-2.5 text-center text-lg font-black tracking-[0.3em] outline-none focus:border-brand"
                data-testid="admin-stepup-otp"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void resendCode()}
                disabled={busy}
                className="flex-1 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy hover:bg-blue-50 disabled:opacity-50"
              >
                Opnieuw sturen
              </button>
              <button
                type="submit"
                disabled={busy || code.length !== 6}
                className="flex-1 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                data-testid="admin-stepup-confirm"
              >
                {confirmLabel}
              </button>
            </div>
          </form>
        )}

        {step === "running" && (
          <p className="py-6 text-center text-sm font-bold text-muted" data-testid="admin-stepup-running">
            Bezig…
          </p>
        )}
      </div>
    </div>
  );
}
