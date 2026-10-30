"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import LanguageSetting from "@/components/LanguageSetting";
import NotificationPreferencesPanel from "@/components/notifications/NotificationPreferencesPanel";
import { ApiError } from "@/lib/api";
import { formatApiError, resendEmailCode } from "@/lib/auth";
import {
  cancelEmailChange,
  changePassword,
  confirmEmailChange,
  deleteAvatar,
  downloadPrivacyExport,
  fetchConsumerProfile,
  requestAccountDeletion,
  requestEmailChange,
  type ConsumerNotifications,
  type ConsumerProfile,
  updateConsumerProfile,
  updateNotificationPreferences,
  uploadAvatar,
} from "@/lib/profile";
import { isLikelyEmail, isStrongEnoughPassword, sanitizePlainText } from "@/lib/security";
import { useLocale } from "@/i18n/LocaleContext";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";

type NotifKey = keyof ConsumerNotifications;

const NOTIF_ROWS: { key: NotifKey; title: string; desc: string }[] = [
  {
    key: "vouchers_discounts",
    title: "Vouchers en kortingen",
    desc: "Ontvang nieuwe vouchers en exclusieve deals.",
  },
  {
    key: "reminders",
    title: "Herinneringen",
    desc: "Krijg meldingen over aflopende vouchers.",
  },
  {
    key: "offers_inspiration",
    title: "Aanbiedingen en inspiratie",
    desc: "Ontvang de beste shops, acties en onmisbare deals.",
  },
];

function verificationBadge(profile: ConsumerProfile): { label: string; className: string } {
  if (profile.pending_email) {
    return { label: "Wijziging in behandeling", className: "bg-amber-100 text-amber-800" };
  }
  if (profile.security.email_verified || profile.email_verification === "verified") {
    return { label: "Geverifieerd", className: "bg-mint text-green-700" };
  }
  return { label: "Niet geverifieerd", className: "bg-amber-100 text-amber-800" };
}

function securityCopy(profile: ConsumerProfile): string {
  if (profile.security.email_verified) {
    return "E-mailadres geverifieerd.";
  }
  return "Verifieer je e-mailadres om je account te beveiligen.";
}

export default function ProfielPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const { session, ready: sessionReady, refresh: refreshSession } = useSession();
  const { pushToast, updateProfile: syncHeaderProfile } = useShopBonus();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ConsumerProfile | null>(null);
  const [form, setForm] = useState({ firstName: "", phone: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [notifBusy, setNotifBusy] = useState<NotifKey | null>(null);

  const [showPwModal, setShowPwModal] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", repeat: "" });
  const [pwBusy, setPwBusy] = useState(false);

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState<"request" | "confirm">("request");
  const [emailForm, setEmailForm] = useState({ email: "", password: "", code: "" });
  const [emailBusy, setEmailBusy] = useState(false);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveLock = useRef(false);

  const applyProfile = useCallback(
    (next: ConsumerProfile) => {
      setProfile(next);
      setForm({ firstName: next.first_name, phone: next.phone ?? "" });
      syncHeaderProfile({
        firstName: next.first_name,
        email: next.email,
        phone: next.phone ?? "",
        avatarUrl: next.avatar_url,
        notifications: {
          vouchers: next.notifications.vouchers_discounts,
          reminders: next.notifications.reminders,
          inspiration: next.notifications.offers_inspiration,
        },
      });
    },
    [syncHeaderProfile]
  );

  const load = useCallback(async () => {
    try {
      const data = await fetchConsumerProfile(locale);
      applyProfile(data);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace(`/account?mode=login&next=${encodeURIComponent("/profiel")}`);
        return;
      }
      pushToast({
        title: "Profiel niet geladen",
        message: formatApiError(err, "Probeer het later opnieuw."),
        kind: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [locale, applyProfile, router, pushToast]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!session?.user) {
      router.replace(`/account?mode=login&next=${encodeURIComponent("/profiel")}`);
      return;
    }
    void load();
  }, [sessionReady, session?.user, load, router]);

  const save = async () => {
    if (!profile || saveLock.current) return;
    const firstName = sanitizePlainText(form.firstName, 60);
    const phone = sanitizePlainText(form.phone, 30);
    const errors: Record<string, string> = {};
    if (!firstName) errors.first_name = "Voornaam is verplicht.";
    else if (!/^[\p{L}\p{M}][\p{L}\p{M}' .-]*$/u.test(firstName)) {
      errors.first_name = "Gebruik alleen letters, spaties, apostroffen of koppeltekens.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      pushToast({ title: "Controleer je gegevens", message: Object.values(errors)[0], kind: "error" });
      return;
    }

    saveLock.current = true;
    setSaving(true);
    try {
      const next = await updateConsumerProfile(
        { first_name: firstName, phone: phone || null, locale },
        locale
      );
      applyProfile(next);
      setFieldErrors({});
      pushToast({ title: "Wijzigingen opgeslagen", message: "Je profiel is bijgewerkt.", kind: "success" });
      void refreshSession?.();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const body = err.body as { error?: { fields?: Record<string, string[]> } } | null;
        const fields = body?.error?.fields ?? {};
        const mapped: Record<string, string> = {};
        for (const [k, msgs] of Object.entries(fields)) {
          mapped[k] = msgs[0] ?? "Ongeldige waarde";
        }
        setFieldErrors(mapped);
      }
      pushToast({
        title: "Opslaan mislukt",
        message: formatApiError(err, "Controleer je invoer en probeer opnieuw."),
        kind: "error",
      });
    } finally {
      setSaving(false);
      saveLock.current = false;
    }
  };

  const onPickPhoto = async (file: File | null) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const next = await uploadAvatar(file, locale);
      applyProfile(next);
      pushToast({ title: "Profielfoto bijgewerkt", message: "Je nieuwe foto is opgeslagen.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Upload geweigerd",
        message: formatApiError(err, "Gebruik een JPG, PNG of WebP tot 2 MB."),
        kind: "error",
      });
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const onRemovePhoto = async () => {
    setPhotoBusy(true);
    try {
      const next = await deleteAvatar(locale);
      applyProfile(next);
      pushToast({ title: "Profielfoto verwijderd", message: "We tonen weer je initialen.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Verwijderen mislukt",
        message: formatApiError(err, "Probeer het later opnieuw."),
        kind: "error",
      });
    } finally {
      setPhotoBusy(false);
    }
  };

  const toggleNotif = async (key: NotifKey) => {
    if (!profile || notifBusy) return;
    const nextValue = !profile.notifications[key];
    setNotifBusy(key);
    // Optimistic UI
    setProfile({
      ...profile,
      notifications: { ...profile.notifications, [key]: nextValue },
    });
    try {
      const prefs = await updateNotificationPreferences({ [key]: nextValue }, locale);
      setProfile((p) => (p ? { ...p, notifications: prefs.notifications } : p));
      syncHeaderProfile({
        notifications: {
          vouchers: prefs.notifications.vouchers_discounts,
          reminders: prefs.notifications.reminders,
          inspiration: prefs.notifications.offers_inspiration,
        },
      });
    } catch (err) {
      setProfile({
        ...profile,
        notifications: { ...profile.notifications, [key]: !nextValue },
      });
      pushToast({
        title: "Voorkeur niet opgeslagen",
        message: formatApiError(err, "Probeer het opnieuw."),
        kind: "error",
      });
    } finally {
      setNotifBusy(null);
    }
  };

  const submitPassword = async () => {
    if (!pw.current || !pw.next || pw.next !== pw.repeat) {
      pushToast({
        title: "Wachtwoord niet gewijzigd",
        message: "Controleer je invoer: de nieuwe wachtwoorden komen niet overeen.",
        kind: "error",
      });
      return;
    }
    if (!isStrongEnoughPassword(pw.next)) {
      pushToast({
        title: "Wachtwoord te zwak",
        message: "Minimaal 10 tekens, met letters én cijfers.",
        kind: "error",
      });
      return;
    }
    setPwBusy(true);
    try {
      await changePassword(pw.current, pw.next, locale);
      setShowPwModal(false);
      setPw({ current: "", next: "", repeat: "" });
      pushToast({ title: "Wachtwoord gewijzigd", message: "Je gebruikt vanaf nu je nieuwe wachtwoord.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Wijzigen mislukt",
        message: formatApiError(err, "Controleer je huidige wachtwoord."),
        kind: "error",
      });
    } finally {
      setPwBusy(false);
    }
  };

  const submitEmailRequest = async () => {
    const email = sanitizePlainText(emailForm.email, 254);
    if (!isLikelyEmail(email) || !emailForm.password) {
      pushToast({ title: "Controleer je invoer", message: "Vul een geldig e-mailadres en je wachtwoord in.", kind: "error" });
      return;
    }
    setEmailBusy(true);
    try {
      const pending = await requestEmailChange(email, emailForm.password, locale);
      setEmailStep("confirm");
      setEmailForm((f) => ({ ...f, password: "", code: "" }));
      const refreshed = await fetchConsumerProfile(locale);
      applyProfile(refreshed);
      pushToast({
        title: "Bevestigingscode verstuurd",
        message: `We hebben een code gestuurd naar ${pending.pending_email}. Je huidige e-mail blijft actief.`,
        kind: "success",
      });
    } catch (err) {
      pushToast({
        title: "E-mailwijziging mislukt",
        message: formatApiError(err, "Controleer je wachtwoord en probeer opnieuw."),
        kind: "error",
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const submitEmailConfirm = async () => {
    if (!/^\d{6}$/.test(emailForm.code)) {
      pushToast({ title: "Ongeldige code", message: "Voer de 6-cijferige code in.", kind: "error" });
      return;
    }
    setEmailBusy(true);
    try {
      await confirmEmailChange(emailForm.code, locale);
      const refreshed = await fetchConsumerProfile(locale);
      applyProfile(refreshed);
      setShowEmailModal(false);
      setEmailStep("request");
      setEmailForm({ email: "", password: "", code: "" });
      void refreshSession?.();
      pushToast({ title: "E-mail bijgewerkt", message: "Je nieuwe e-mailadres is geverifieerd.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Code ongeldig",
        message: formatApiError(err, "De code is verlopen of al gebruikt."),
        kind: "error",
      });
    } finally {
      setEmailBusy(false);
    }
  };

  const onCancelPendingEmail = async () => {
    try {
      await cancelEmailChange(locale);
      const refreshed = await fetchConsumerProfile(locale);
      applyProfile(refreshed);
      setShowEmailModal(false);
      setEmailStep("request");
      pushToast({ title: "Wijziging geannuleerd", message: "Je huidige e-mailadres blijft actief.", kind: "info" });
    } catch (err) {
      pushToast({
        title: "Annuleren mislukt",
        message: formatApiError(err, "Probeer het opnieuw."),
        kind: "error",
      });
    }
  };

  const onResendVerification = async () => {
    try {
      await resendEmailCode(locale);
      pushToast({ title: "Code opnieuw verstuurd", message: "Check je inbox voor de verificatiecode.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Opnieuw versturen mislukt",
        message: formatApiError(err, "Wacht even en probeer opnieuw."),
        kind: "error",
      });
    }
  };

  const onExport = async () => {
    try {
      const blob = await downloadPrivacyExport(locale);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shopbonus-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ title: "Export klaar", message: "Je gegevensdownload is gestart.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Export mislukt",
        message: formatApiError(err, "Probeer het later opnieuw."),
        kind: "error",
      });
    }
  };

  const onDeleteRequest = async () => {
    if (!deletePassword) {
      pushToast({ title: "Wachtwoord vereist", message: "Bevestig met je huidige wachtwoord.", kind: "error" });
      return;
    }
    setDeleteBusy(true);
    try {
      await requestAccountDeletion(deletePassword, locale);
      setShowDeleteModal(false);
      setDeletePassword("");
      pushToast({
        title: "Verzoek ontvangen",
        message: "Je verwijderverzoek is geregistreerd. We houden rekening met bewaarplichten.",
        kind: "success",
      });
    } catch (err) {
      pushToast({
        title: "Verzoek mislukt",
        message: formatApiError(err, "Controleer je wachtwoord."),
        kind: "error",
      });
    } finally {
      setDeleteBusy(false);
    }
  };

  if (!sessionReady || loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-blue-100/80" />
        <div className="mt-8 grid gap-6 lg:grid-cols-5">
          <div className="h-96 animate-pulse rounded-[1.75rem] bg-white/70 lg:col-span-3" />
          <div className="space-y-6 lg:col-span-2">
            <div className="h-48 animate-pulse rounded-[1.75rem] bg-white/70" />
            <div className="h-48 animate-pulse rounded-[1.75rem] bg-white/70" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  const badge = verificationBadge(profile);
  const initial = (profile.first_name.charAt(0) || "S").toUpperCase();

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[140px] h-[28rem] w-[28rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-[clamp(2.6rem,6vw,4.2rem)] font-black leading-none tracking-tight">
          <span className="text-navy">Mijn</span> <span className="text-brand">profiel</span>
        </h1>
        <p className="mt-3 text-lg text-muted">Beheer je gegevens en accountinstellingen.</p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-5">
          {/* Personal data */}
          <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)] sm:p-8 lg:col-span-3">
            <h2 className="text-2xl font-black text-navy">Persoonlijke gegevens</h2>
            <p className="mt-1 text-muted">Hier kun je je persoonlijke gegevens beheren.</p>

            <div className="mt-6 flex items-center gap-5">
              <div className="relative">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-24 w-24 rounded-full object-cover ring-2 ring-blue-50"
                  />
                ) : (
                  <span className="grid h-24 w-24 place-items-center rounded-full bg-brand-light text-5xl font-black text-navy">
                    {initial}
                  </span>
                )}
                <button
                  type="button"
                  disabled={photoBusy}
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full bg-white text-brand shadow-lg disabled:opacity-60"
                  aria-label="Profielfoto wijzigen"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => void onPickPhoto(e.target.files?.[0] ?? null)}
                />
              </div>
              <div>
                <p className="text-2xl font-black text-navy">{profile.first_name}</p>
                <div className="mt-1 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={photoBusy}
                    onClick={() => fileRef.current?.click()}
                    className="font-semibold text-brand underline underline-offset-2 hover:text-brand-dark disabled:opacity-60"
                  >
                    {photoBusy ? "Bezig…" : "Profielfoto wijzigen"}
                  </button>
                  {profile.avatar_url && (
                    <button
                      type="button"
                      disabled={photoBusy}
                      onClick={() => void onRemovePhoto()}
                      className="font-semibold text-muted underline underline-offset-2 hover:text-navy disabled:opacity-60"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <div>
                <label className="mb-1.5 block font-bold text-navy">Voornaam</label>
                <input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  className="w-full rounded-2xl border border-blue-100 bg-white px-5 py-3.5 font-medium text-navy focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  autoComplete="given-name"
                />
                {fieldErrors.first_name && <p className="mt-1 text-sm font-semibold text-red-600">{fieldErrors.first_name}</p>}
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-navy">E-mailadres</label>
                <div className="relative">
                  <input
                    value={profile.email}
                    readOnly
                    type="email"
                    className="w-full rounded-2xl border border-blue-100 bg-slate-50 py-3.5 pl-5 pr-48 font-medium text-navy"
                  />
                  <span className={`absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-extrabold ${badge.className}`}>
                    {badge.label === "Geverifieerd" && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="currentColor" />
                        <path d="m8 12.5 2.7 2.7L16 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {badge.label}
                  </span>
                </div>
                {profile.pending_email && (
                  <p className="mt-2 text-sm text-muted">
                    Bevestiging in behandeling voor <strong className="text-navy">{profile.pending_email}</strong>.{" "}
                    <button type="button" className="font-semibold text-brand underline" onClick={() => { setEmailStep("confirm"); setShowEmailModal(true); }}>
                      Code invoeren
                    </button>
                    {" · "}
                    <button type="button" className="font-semibold text-muted underline" onClick={() => void onCancelPendingEmail()}>
                      Annuleren
                    </button>
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setEmailStep(profile.pending_email ? "confirm" : "request");
                    setShowEmailModal(true);
                  }}
                  className="mt-2 text-sm font-semibold text-brand underline underline-offset-2 hover:text-brand-dark"
                >
                  E-mailadres wijzigen
                </button>
              </div>
              <div>
                <label className="mb-1.5 block font-bold text-navy">
                  Telefoonnummer <span className="font-medium text-muted">(optioneel)</span>
                </label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Bijv. 06 12345678 of +31 6 12345678"
                  className="w-full rounded-2xl border border-blue-100 bg-white px-5 py-3.5 font-medium text-navy placeholder:text-muted/60 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                  autoComplete="tel"
                />
                {fieldErrors.phone && <p className="mt-1 text-sm font-semibold text-red-600">{fieldErrors.phone}</p>}
              </div>
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] transition hover:bg-brand-dark disabled:opacity-70"
              >
                {saving && <span className="h-5 w-5 animate-spin rounded-full border-[3px] border-white/40 border-t-white" />}
                {saving ? "Opslaan…" : "Wijzigingen opslaan"}
              </button>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-navy">Accountbeveiliging</h2>
                  <p className="mt-1 text-muted">{securityCopy(profile)}</p>
                </div>
                <span
                  className={`grid h-20 w-20 shrink-0 place-items-center rounded-full ${
                    profile.security.email_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}
                >
                  <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                    <rect x="5" y="10" width="14" height="10" rx="2.5" fill="currentColor" opacity="0.9" />
                    <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="2.4" />
                    <circle cx="12" cy="15" r="1.5" fill="white" />
                  </svg>
                </span>
              </div>
              <div className="mt-5 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowPwModal(true)}
                  className="flex w-full items-center gap-4 rounded-2xl border border-blue-50 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <circle cx="8" cy="15" r="4.5" stroke="currentColor" strokeWidth="2.2" />
                      <path d="m11.5 11.5 8-8M17 5l2.5 2.5M14.5 7.5 17 10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block font-extrabold text-navy">Wachtwoord wijzigen</span>
                    <span className="block text-sm text-muted">Kies een nieuw en veilig wachtwoord.</span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-navy">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (profile.security.email_verified) {
                      pushToast({
                        title: "E-mailverificatie actief",
                        message: "Je e-mailadres is geverifieerd.",
                        kind: "success",
                      });
                    } else {
                      void onResendVerification();
                    }
                  }}
                  className="flex w-full items-center gap-4 rounded-2xl border border-blue-50 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
                >
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
                      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="flex-1">
                    <span className="block font-extrabold text-navy">
                      {profile.security.email_verified ? "E-mailverificatie actief" : "E-mailverificatie vereist"}
                    </span>
                    <span className="block text-sm text-muted">
                      {profile.security.email_verified
                        ? "Je e-mailadres is geverifieerd."
                        : "Stuur opnieuw een verificatiecode."}
                    </span>
                  </span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-navy">
                    <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <LanguageSetting />

            <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
              <h2 className="text-2xl font-black text-navy">E-mailmeldingen</h2>
              <p className="mt-1 text-muted">Ontvang alleen de updates die je interessant vindt.</p>
              <div className="mt-5 space-y-5">
                {NOTIF_ROWS.map(({ key, title, desc }) => {
                  const on = profile.notifications[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={notifBusy === key}
                      onClick={() => void toggleNotif(key)}
                      className="flex w-full items-start gap-3.5 text-left disabled:opacity-60"
                    >
                      <span
                        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg transition ${
                          on ? "bg-brand text-white" : "border-2 border-slate-200 bg-white text-transparent"
                        }`}
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>
                        <span className="block font-extrabold text-navy">{title}</span>
                        <span className="block text-[15px] text-muted">{desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-5 text-xs text-muted">
                Account-, beveiligings- en transactiemails worden altijd verstuurd en hangen niet af van deze voorkeuren.
              </p>
            </div>

            <NotificationPreferencesPanel />

            <div className="rounded-[1.75rem] bg-white p-7 shadow-[0_10px_36px_-16px_rgba(10,27,63,0.2)]">
              <h2 className="text-xl font-black text-navy">Voorkeuren & privacy</h2>
              <p className="mt-1 text-sm text-muted">Favorieten en privacy blijven gekoppeld aan dit account.</p>
              <div className="mt-4 space-y-2">
                <Link href="/webshops" className="block rounded-2xl border border-blue-50 px-4 py-3 text-sm font-bold text-navy hover:border-blue-200">
                  Favoriete webshops beheren
                </Link>
                <button
                  type="button"
                  onClick={() => void onExport()}
                  className="block w-full rounded-2xl border border-blue-50 px-4 py-3 text-left text-sm font-bold text-navy hover:border-blue-200"
                >
                  Mijn gegevens downloaden
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="block w-full rounded-2xl border border-red-50 px-4 py-3 text-left text-sm font-bold text-red-600 hover:border-red-200"
                >
                  Accountverwijdering aanvragen
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Password modal */}
      {showPwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" onClick={() => !pwBusy && setShowPwModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-navy">Wachtwoord wijzigen</h3>
            <p className="mt-1 text-sm text-muted">Minimaal 10 tekens, met letters én cijfers.</p>
            <div className="mt-5 space-y-3">
              {([["current", "Huidig wachtwoord"], ["next", "Nieuw wachtwoord"], ["repeat", "Herhaal nieuw wachtwoord"]] as const).map(([k, label]) => (
                <div key={k}>
                  <label className="mb-1 block text-sm font-bold text-navy">{label}</label>
                  <input
                    type="password"
                    value={pw[k]}
                    onChange={(e) => setPw({ ...pw, [k]: e.target.value })}
                    autoComplete={k === "current" ? "current-password" : "new-password"}
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy focus:border-brand focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={pwBusy} onClick={() => setShowPwModal(false)} className="flex-1 rounded-2xl bg-slate-100 py-3.5 font-extrabold text-navy hover:bg-slate-200">
                Annuleren
              </button>
              <button type="button" disabled={pwBusy} onClick={() => void submitPassword()} className="flex-1 rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-70">
                {pwBusy ? "Opslaan…" : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email change modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" onClick={() => !emailBusy && setShowEmailModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-navy">
              {emailStep === "request" ? "E-mailadres wijzigen" : "Bevestigingscode"}
            </h3>
            <p className="mt-1 text-sm text-muted">
              {emailStep === "request"
                ? "Je huidige e-mail blijft actief tot je de nieuwe hebt bevestigd."
                : `Voer de 6-cijferige code in die we naar ${profile.pending_email ?? "het nieuwe adres"} hebben gestuurd.`}
            </p>
            <div className="mt-5 space-y-3">
              {emailStep === "request" ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Nieuw e-mailadres</label>
                    <input
                      type="email"
                      value={emailForm.email}
                      onChange={(e) => setEmailForm({ ...emailForm, email: e.target.value })}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy focus:border-brand focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Huidig wachtwoord</label>
                    <input
                      type="password"
                      value={emailForm.password}
                      onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy focus:border-brand focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy">Code</label>
                  <input
                    inputMode="numeric"
                    maxLength={6}
                    value={emailForm.code}
                    onChange={(e) => setEmailForm({ ...emailForm, code: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy tracking-widest focus:border-brand focus:outline-none"
                  />
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={emailBusy} onClick={() => setShowEmailModal(false)} className="flex-1 rounded-2xl bg-slate-100 py-3.5 font-extrabold text-navy hover:bg-slate-200">
                Annuleren
              </button>
              <button
                type="button"
                disabled={emailBusy}
                onClick={() => void (emailStep === "request" ? submitEmailRequest() : submitEmailConfirm())}
                className="flex-1 rounded-2xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-70"
              >
                {emailBusy ? "Bezig…" : emailStep === "request" ? "Code versturen" : "Bevestigen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deletion modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/50 p-4 backdrop-blur-sm" onClick={() => !deleteBusy && setShowDeleteModal(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black text-navy">Accountverwijdering aanvragen</h3>
            <p className="mt-1 text-sm text-muted">
              Dit start een verzoek. Financiële en vouchergegevens kunnen volgens bewaarplicht behouden blijven.
            </p>
            <div className="mt-5">
              <label className="mb-1 block text-sm font-bold text-navy">Huidig wachtwoord</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy focus:border-brand focus:outline-none"
              />
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" disabled={deleteBusy} onClick={() => setShowDeleteModal(false)} className="flex-1 rounded-2xl bg-slate-100 py-3.5 font-extrabold text-navy hover:bg-slate-200">
                Annuleren
              </button>
              <button type="button" disabled={deleteBusy} onClick={() => void onDeleteRequest()} className="flex-1 rounded-2xl bg-red-600 py-3.5 font-extrabold text-white hover:bg-red-700 disabled:opacity-70">
                {deleteBusy ? "Bezig…" : "Verzoek indienen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
