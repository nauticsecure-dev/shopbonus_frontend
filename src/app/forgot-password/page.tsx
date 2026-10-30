"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Icon from "@/components/DashboardIcon";
import { useLocale } from "@/i18n/LocaleContext";
import { authCopy } from "@/i18n/authCopy";
import { forgotPassword, formatApiError } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const { locale } = useLocale();
  const copy = authCopy(locale);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await forgotPassword(email.trim(), locale);
      setDone(true);
    } catch (err) {
      // Still show the generic success copy when possible; only surface hard failures.
      setError(formatApiError(err, copy.forgotSuccess));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="account-page mx-auto max-w-lg px-4 py-10 sm:px-6 lg:py-14">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[.19em] text-brand">{copy.eyebrow}</p>
      <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-navy">{copy.forgotTitle}</h1>
      <p className="mt-3 text-muted">{copy.forgotBody}</p>
      <div className="surface mt-8 p-5 sm:p-8">
        {done ? (
          <div role="status" className="space-y-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand">
              <Icon name="check" size={28} />
            </span>
            <p className="text-sm leading-relaxed text-navy">{copy.forgotSuccess}</p>
            <Link href="/account?mode=login" className="primary-button inline-flex w-full">
              {copy.backToLogin}
              <Icon name="arrow" size={20} />
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="field-label" htmlFor="email">
                {copy.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder={copy.emailPlaceholder}
              />
            </div>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" className="primary-button w-full" disabled={loading} aria-busy={loading}>
              {loading ? (copy.submitting) : (copy.forgotSubmit)}
              {!loading && <Icon name="arrow" size={20} />}
            </button>
            <p className="text-center text-sm">
              <Link href="/account?mode=login" className="font-bold text-brand hover:underline">
                {copy.backToLogin}
              </Link>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
