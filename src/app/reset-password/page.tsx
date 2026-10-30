"use client";

import { Suspense, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Icon from "@/components/DashboardIcon";
import { useLocale } from "@/i18n/LocaleContext";
import { authCopy } from "@/i18n/authCopy";
import { formatApiError, passwordStrength, resetPassword } from "@/lib/auth";
import { ApiError } from "@/lib/api";

function ResetForm() {
  const params = useSearchParams();
  const { locale } = useLocale();
  const copy = authCopy(locale);
  const token = params.get("token") || "";
  const emailParam = params.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(!token);

  const strength = useMemo(() => passwordStrength(password), [password]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (loading) return;
    setError("");
    if (password !== confirm) {
      setError(locale === "en" ? "Passwords do not match." : "Wachtwoorden komen niet overeen.");
      return;
    }
    setLoading(true);
    try {
      await resetPassword(
        {
          token,
          email: email.trim(),
          password,
          password_confirmation: confirm,
        },
        locale
      );
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 422 || err.status === 400)) {
        setExpired(true);
        setError(copy.resetInvalid);
      } else {
        setError(formatApiError(err, copy.resetInvalid));
      }
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="surface p-5 sm:p-8" role="status">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand">
          <Icon name="check" size={28} />
        </span>
        <p className="mt-4 text-sm leading-relaxed text-navy">{copy.resetSuccess}</p>
        <Link href="/account?mode=login" className="primary-button mt-6 inline-flex w-full">
          {copy.backToLogin}
          <Icon name="arrow" size={20} />
        </Link>
      </div>
    );
  }

  if (expired && !token) {
    return (
      <div className="surface space-y-4 p-5 sm:p-8" role="alert">
        <p className="text-sm text-red-700">{copy.resetInvalid}</p>
        <Link href="/forgot-password" className="primary-button inline-flex w-full">
          {copy.forgotSubmit}
          <Icon name="arrow" size={20} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="surface space-y-5 p-5 sm:p-8">
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
        />
      </div>
      <div>
        <label className="field-label" htmlFor="password">
          {copy.password}
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={10}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input pr-14"
            placeholder={copy.passwordPlaceholder}
          />
          <button
            type="button"
            aria-label={showPassword ? (copy.hidePassword) : (copy.showPassword)}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
          >
            <Icon name="eye" size={21} />
          </button>
        </div>
        {password && (
          <div className="mt-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < strength.score ? "bg-brand" : "bg-blue-100"}`} />
            ))}
          </div>
        )}
      </div>
      <div>
        <label className="field-label" htmlFor="confirm">
          {copy.confirmPassword}
        </label>
        <input
          id="confirm"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={10}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="form-input"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" className="primary-button w-full" disabled={loading} aria-busy={loading}>
        {loading ? (copy.submitting) : (copy.resetSubmit)}
        {!loading && <Icon name="arrow" size={20} />}
      </button>
      <p className="text-center text-sm">
        <Link href="/forgot-password" className="font-bold text-brand hover:underline">
          {copy.forgot}
        </Link>
      </p>
    </form>
  );
}

export default function ResetPasswordPage() {
  const { locale } = useLocale();
  const copy = authCopy(locale);

  return (
    <section className="account-page mx-auto max-w-lg px-4 py-10 sm:px-6 lg:py-14">
      <p className="mb-3 text-xs font-extrabold uppercase tracking-[.19em] text-brand">{copy.eyebrow}</p>
      <h1 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-extrabold tracking-tight text-navy">{copy.resetTitle}</h1>
      <p className="mt-3 text-muted">{copy.resetBody}</p>
      <div className="mt-8">
        <Suspense fallback={<div className="p-8 text-center text-muted">{copy.loading}</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </section>
  );
}
