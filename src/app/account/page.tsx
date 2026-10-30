"use client";

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Icon from "@/components/DashboardIcon";
import { useShopBonus } from "@/store/ShopBonusContext";
import { useSession } from "@/store/SessionContext";
import { useLocale } from "@/i18n/LocaleContext";
import { authCopy } from "@/i18n/authCopy";
import {
  fetchLegalRequirements,
  formatApiError,
  loginAccount,
  maskEmail,
  passwordStrength,
  fetchMe,
  merchantHasShop,
  pathForDestination,
  registerAccount,
  resendEmailCode,
  verifyEmailCode,
  type LegalRequirements,
  type MeUser,
} from "@/lib/auth";
import { ApiError } from "@/lib/api";

function strengthLabel(copy: ReturnType<typeof authCopy>, label: string) {
  if (label === "strong") return copy.strengthStrong;
  if (label === "ok") return copy.strengthOk;
  if (label === "fair") return copy.strengthFair;
  return copy.strengthWeak;
}

function AccountForm() {
  const params = useSearchParams();
  const router = useRouter();
  const { locale, setLocale } = useLocale();
  const copy = authCopy(locale);
  const { setUser, session, ready, refresh } = useSession();
  const { updateProfile, pushToast } = useShopBonus();

  const initialMode = params.get("mode") === "login" || params.get("verify") === "1" ? "login" : "register";
  const [mode, setMode] = useState(initialMode);
  const [role, setRole] = useState<"consumer" | "merchant">(
    params.get("role") === "consumer" ? "consumer" : "merchant"
  );
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [legal, setLegal] = useState<LegalRequirements | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const login = mode === "login";
  const strength = useMemo(() => passwordStrength(form.password), [form.password]);

  const loadLegal = useCallback(async () => {
    try {
      const data = await fetchLegalRequirements(locale);
      setLegal(data);
    } catch {
      setLegal(null);
    }
  }, [locale]);

  useEffect(() => {
    void loadLegal();
  }, [loadLegal]);

  useEffect(() => {
    if (!ready) return;
    if (session?.user && !session.user.email_verified) {
      setVerifying(true);
      setForm((f) => ({ ...f, email: session.user.email, name: session.user.first_name }));
      setMode("register");
    }
  }, [ready, session]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  function applyUser(user: MeUser, toastTitle: string, toastMessage?: string) {
    setUser(user);
    updateProfile({
      email: user.email,
      firstName: user.first_name,
      lastName: "",
    });
    if (toastMessage) {
      pushToast({ title: toastTitle, message: toastMessage, kind: "success" });
    }
    if (user.destination === "verify_email" || !user.email_verified) {
      setVerifying(true);
      return;
    }
    // Existing shop → merchant dashboard on every login.
    if (merchantHasShop(user) || user.destination === "workspace") {
      router.replace(pathForDestination("workspace", params.get("next"), user));
      return;
    }
    router.replace(pathForDestination(user.destination, params.get("next"), user));
  }

  useEffect(() => {
    if (!ready || verifying || loading) return;
    const user = session?.user;
    if (!user?.email_verified) return;
    if (merchantHasShop(user) || user.destination === "workspace" || user.destination === "admin") {
      router.replace(pathForDestination(user.destination, params.get("next"), user));
    }
  }, [ready, session, verifying, loading, router, params]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      if (verifying) {
        const user = await verifyEmailCode(code, locale);
        // Prefer fresh /me so workspace membership is authoritative.
        const me = (await fetchMe(locale)) ?? user;
        applyUser(me, copy.verifyToast, copy.welcomeRegister);
        return;
      }

      if (login) {
        const result = await loginAccount(form.email.trim(), form.password, locale);
        if (result.twoFactor) {
          setError(copy.twoFactor);
          return;
        }
        if (result.user) {
          const me = (await fetchMe(locale)) ?? result.user;
          applyUser(me, copy.welcomeLogin, copy.welcomeLogin);
        }
        return;
      }

      if (!legal?.registration_available || !legal.documents.terms.version || !legal.documents.privacy.version) {
        setError(copy.legalUnavailable);
        return;
      }
      if (!acceptTerms) {
        setError(locale === "en" ? "Please accept the Terms and Privacy Policy." : "Accepteer de voorwaarden om door te gaan.");
        return;
      }

      const user = await registerAccount(
        {
          account_type: role === "merchant" ? "merchant" : "consumer",
          first_name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          accept_terms: true,
          terms_version: legal.documents.terms.version,
          privacy_version: legal.documents.privacy.version,
          marketing_opt_in: marketing,
          locale,
        },
        locale
      );
      setResendIn(60);
      applyUser(user, copy.welcomeRegister , copy.verifyBody );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(copy.genericLoginError );
      } else if (err instanceof ApiError && err.status === 422 && login) {
        setError(copy.genericLoginError );
      } else {
        setError(formatApiError(err, copy.genericLoginError ));
      }
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (resendIn > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      if (!session?.user) await refresh();
      const data = await resendEmailCode(locale);
      setResendIn(data.resend_available_in_seconds || 60);
      pushToast({
        title: copy.resend ,
        message: locale === "en" ? "A new code was sent." : "Er is een nieuwe code verstuurd.",
        kind: "info",
      });
    } catch (err) {
      setError(formatApiError(err, copy.genericLoginError ));
    } finally {
      setLoading(false);
    }
  }

  function changeMode(value: string) {
    setMode(value);
    setVerifying(false);
    setError("");
    setCode("");
  }

  const termsHref = legal?.documents.terms.document_url || "/hoe-werkt-het";
  const privacyHref = legal?.documents.privacy.document_url || "/over-ons";
  const steps = role === "merchant" ? copy.stepsMerchant : copy.stepsConsumer;
  const stepLabels = role === "merchant" ? copy.stepLabelsMerchant : copy.stepLabelsConsumer;

  return (
    <section className="account-page mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-xs font-extrabold uppercase tracking-[.19em] text-brand">{copy.eyebrow }</p>
        <div className="ml-auto flex rounded-lg border border-blue-100 bg-white p-1 text-xs font-bold" role="group" aria-label="Language">
          {(["nl", "en"] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLocale(l)}
              aria-pressed={locale === l}
              className={`rounded-md px-2.5 py-1 uppercase ${locale === l ? "bg-brand text-white" : "text-muted"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <h1 className="max-w-5xl text-[clamp(2rem,4.3vw,3.7rem)] font-extrabold leading-[1.12] tracking-tight text-navy">
        {login ? (
          <>
            {locale === "nl" ? (
              <>
                Welkom terug bij <span className="text-brand">ShopBonus.</span>
              </>
            ) : (
              <>
                Welcome back to <span className="text-brand">ShopBonus.</span>
              </>
            )}
          </>
        ) : (
          <>
            {locale === "nl" ? (
              <>
                Maak je <span className="text-brand">ShopBonus-account</span> aan
              </>
            ) : (
              <>
                Create your <span className="text-brand">ShopBonus</span> account
              </>
            )}
          </>
        )}
      </h1>
      <p className="mt-3 text-lg text-muted sm:text-xl">{copy.subtitle }</p>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        <div className="surface p-5 sm:p-8">
          <div className="segmented" aria-label="Accountactie">
            {(
              [
                ["register", copy.tabRegister],
                ["login", copy.tabLogin],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => changeMode(value)}
                aria-pressed={mode === value}
                className={mode === value ? "selected" : ""}
              >
                {label }
              </button>
            ))}
          </div>
          {!verifying && !login && (
            <div className="mt-4 space-y-2" aria-label={copy.rolePickerLabel}>
              <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{copy.rolePickerLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["consumer", copy.consumer, copy.consumerHint, "users"],
                    ["merchant", copy.merchant, copy.merchantHint, "store"],
                  ] as const
                ).map(([value, label, hint, icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    aria-pressed={role === value}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-center transition ${
                      role === value ? "border-brand bg-blue-50 text-brand" : "border-blue-100 text-muted hover:bg-blue-50"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-bold">
                      <Icon name={icon} size={20} />
                      {label}
                    </span>
                    <span className={`text-[11px] font-semibold leading-snug ${role === value ? "text-brand/80" : "text-muted"}`}>
                      {hint}
                    </span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted">
                {role === "merchant" ? copy.merchantRoleNote : copy.consumerRoleNote}
              </p>
            </div>
          )}
          <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
            {verifying ? (
              <>
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-brand">
                  <Icon name="check" size={28} />
                </span>
                <div>
                  <h2 className="text-2xl font-extrabold text-navy">{copy.verifyTitle }</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {copy.verifyBody } <strong>{maskEmail(form.email || session?.email || "")}</strong>.
                  </p>
                </div>
                <label className="field-label" htmlFor="verification">
                  {copy.verifyLabel }
                </label>
                <input
                  id="verification"
                  autoFocus
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  onPaste={(e) => {
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (pasted) {
                      e.preventDefault();
                      setCode(pasted);
                    }
                  }}
                  className="form-input text-center text-2xl tracking-[.5em]"
                  placeholder="000000"
                  aria-invalid={!!error}
                />
                <button
                  type="button"
                  onClick={() => void onResend()}
                  disabled={resendIn > 0 || loading}
                  className="text-sm font-bold text-brand disabled:text-muted"
                >
                  {resendIn > 0
                    ? `${copy.resendIn } ${resendIn}${copy.seconds }`
                    : (copy.resend )}
                </button>
              </>
            ) : (
              <>
                {!login && (
                  <div>
                    <label className="field-label" htmlFor="name">
                      {copy.firstName }
                    </label>
                    <input
                      id="name"
                      autoComplete="given-name"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="form-input"
                      placeholder={copy.firstNamePlaceholder }
                    />
                  </div>
                )}
                <div>
                  <label className="field-label" htmlFor="email">
                    {copy.email }
                  </label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="form-input"
                    placeholder={copy.emailPlaceholder }
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="password">
                    {copy.password }
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={login ? "current-password" : "new-password"}
                      minLength={login ? 1 : 10}
                      required
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="form-input pr-14"
                      placeholder={copy.passwordPlaceholder }
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? (copy.hidePassword ) : (copy.showPassword )}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted"
                    >
                      <Icon name="eye" size={21} />
                    </button>
                  </div>
                  {!login && form.password && (
                    <div className="mt-2" aria-live="polite">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <span
                            key={i}
                            className={`h-1.5 flex-1 rounded-full ${i < strength.score ? "bg-brand" : "bg-blue-100"}`}
                          />
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {strengthLabel(copy, strength.label)} · {copy.strengthHint }
                      </p>
                    </div>
                  )}
                </div>
                {login && (
                  <div className="text-right">
                    <Link href="/forgot-password" className="text-sm font-bold text-brand hover:underline">
                      {copy.forgot }
                    </Link>
                  </div>
                )}
                {!login && (
                  <>
                    <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                      <input
                        required
                        type="checkbox"
                        checked={acceptTerms}
                        onChange={(e) => setAcceptTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                      />
                      <span>
                        {copy.acceptTermsPrefix }{" "}
                        <a href={termsHref} target="_blank" rel="noreferrer" className="font-bold text-brand hover:underline">
                          {copy.terms }
                        </a>{" "}
                        {copy.and }{" "}
                        <a href={privacyHref} target="_blank" rel="noreferrer" className="font-bold text-brand hover:underline">
                          {copy.privacy }
                        </a>
                        .
                      </span>
                    </label>
                    <label className="flex items-start gap-3 text-sm leading-relaxed text-muted">
                      <input
                        type="checkbox"
                        checked={marketing}
                        onChange={(e) => setMarketing(e.target.checked)}
                        className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                      />
                      <span>{copy.marketing }</span>
                    </label>
                  </>
                )}
              </>
            )}
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button type="submit" className="primary-button w-full" disabled={loading} aria-busy={loading}>
              {loading
                ? (copy.submitting )
                : verifying
                  ? (copy.verifySubmit )
                  : login
                    ? (copy.submitLogin )
                    : (copy.submitRegister )}
              {!loading && <Icon name="arrow" size={20} />}
            </button>
            <p className="text-center text-sm text-muted">
              {login ? (copy.noAccount ) : (copy.haveAccount )}{" "}
              <button
                type="button"
                onClick={() => changeMode(login ? "register" : "login")}
                className="font-bold text-brand hover:underline"
              >
                {login ? (copy.tabRegister ) : (copy.tabLogin )}
              </button>
            </p>
          </form>
          <p className="mt-6 border-t border-blue-50 pt-4 text-center text-xs leading-relaxed text-muted">
            {copy.footerNote }
          </p>
        </div>
        <aside className="space-y-5">
          <div className="account-benefits relative overflow-hidden rounded-3xl border border-white p-6 sm:p-9">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-brand">
              <Icon name="check" size={14} /> {copy.benefitsFree }
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight text-navy">
              {locale === "nl" ? (
                <>
                  In <span className="text-brand">2 minuten</span> gestart
                </>
              ) : (
                <>
                  Ready in <span className="text-brand">2 minutes</span>
                </>
              )}
            </h2>
            <p className="mt-3 max-w-sm leading-relaxed text-muted">
              {role === "merchant" ? (copy.benefitsMerchant ) : (copy.benefitsConsumer )}
            </p>
            <ul className="my-7 space-y-4">
              {steps.map((t) => (
                <li key={t} className="flex items-center gap-3 text-sm font-semibold text-navy">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-100 text-brand">
                    <Icon name="check" size={16} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div aria-hidden="true" className="relative mx-auto my-8 flex h-40 max-w-xs items-center justify-center">
              <div className="absolute h-40 w-40 rounded-full bg-white/60" />
              <div className="relative -rotate-6 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 px-8 py-6 text-white shadow-xl shadow-blue-500/20">
                <Icon name="wallet" size={36} />
                <p className="mt-4 text-xs text-blue-100">Jouw ShopBonus-tegoed</p>
                <p className="mt-1 text-3xl font-extrabold">Meer voordeel.</p>
              </div>
              <span className="absolute -right-1 top-0 rotate-12 rounded-2xl border-4 border-white bg-blue-500 p-4 text-3xl font-extrabold text-white shadow-lg">
                %
              </span>
            </div>
            <ol className="mt-9 grid grid-cols-3 gap-2 border-t border-blue-200/60 pt-5">
              {stepLabels.map((label, i) => (
                <li key={label} className="flex flex-col items-center gap-2 text-xs font-semibold text-muted">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-full ${
                      i === 0 ? "bg-brand text-white ring-4 ring-blue-200" : "bg-white/70 text-muted"
                    }`}
                  >
                    {i + 1}
                  </span>
                  {label}
                </li>
              ))}
            </ol>
          </div>
          <Link href="/webshops" className="flex items-center justify-center gap-2 py-2 text-sm font-semibold text-muted hover:text-brand">
            {copy.browseShops } <Icon name="arrow" size={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-muted">Account laden…</div>}>
      <AccountForm />
    </Suspense>
  );
}
