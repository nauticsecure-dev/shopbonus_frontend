"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eyebrow } from "@/components/Cards";
import ComplianceStepper from "@/components/onboarding/ComplianceStepper";
import DashboardIcon from "@/components/DashboardIcon";
import { useSession } from "@/store/SessionContext";
import { useShopBonus } from "@/store/ShopBonusContext";
import { formatApiError, hasApprovedWorkspace, merchantHasShop } from "@/lib/auth";
import {
  ApiError,
  createWorkspace,
  fetchOnboarding,
  savePublicProfile,
  type OnboardingData,
} from "@/lib/onboarding";
import {
  acceptMerchantAgreement,
  checkOwnershipVerification,
  complianceResumePath,
  confirmOwnershipEmailCode,
  fetchFullBusinessProfile,
  fetchMerchantAgreement,
  fetchPlaceDetails,
  listOwnershipVerifications,
  saveFullBusinessProfile,
  searchBusinesses,
  startOwnershipVerification,
  submitOwnershipReview,
  type FullBusinessProfile,
  type MerchantAgreement,
  type OwnershipVerification,
  type PlaceSuggestion,
} from "@/lib/workspaceCompliance";

type ProfileForm = {
  legal_name: string;
  trading_name: string;
  website_url: string;
  kvk_number: string;
  vat_number: string;
  contact_email: string;
  contact_phone: string;
  main_contact_name: string;
  address_line: string;
  postal_code: string;
  city: string;
  country_code: string;
  preferred_language: string;
  business_category: string;
  google_place_id: string;
  source: "manual" | "google";
};

/** Mirrors BusinessProfile::REQUIRED (+ NL KvK) so the form marks what confirm needs. */
const REQUIRED_FIELDS = [
  "legal_name",
  "website_url",
  "contact_email",
  "address_line",
  "postal_code",
  "city",
  "country_code",
] as const;

const EMPTY_FORM: ProfileForm = {
  legal_name: "",
  trading_name: "",
  website_url: "",
  kvk_number: "",
  vat_number: "",
  contact_email: "",
  contact_phone: "",
  main_contact_name: "",
  address_line: "",
  postal_code: "",
  city: "",
  country_code: "NL",
  preferred_language: "nl",
  business_category: "",
  google_place_id: "",
  source: "manual",
};

const STEP_ORDER = ["business_details", "ownership", "agreement", "activation"] as const;

function clampComplianceStep(requested: string | null, nextStep: string | null): (typeof STEP_ORDER)[number] {
  const server = (nextStep && STEP_ORDER.includes(nextStep as (typeof STEP_ORDER)[number])
    ? nextStep
    : "business_details") as (typeof STEP_ORDER)[number];
  if (!requested || !STEP_ORDER.includes(requested as (typeof STEP_ORDER)[number])) {
    return server;
  }
  const want = requested as (typeof STEP_ORDER)[number];
  // Never show a step ahead of what the server still requires.
  return STEP_ORDER.indexOf(want) <= STEP_ORDER.indexOf(server) ? want : server;
}

function missingFieldsFromError(err: unknown): string[] {
  if (!(err instanceof ApiError) || !err.body || typeof err.body !== "object") return [];
  const details = (err.body as { error?: { details?: { missing_fields?: unknown } } }).error?.details;
  const fields = details?.missing_fields;
  return Array.isArray(fields) ? fields.filter((f): f is string => typeof f === "string") : [];
}

function profileToForm(p: FullBusinessProfile): ProfileForm {
  return {
    legal_name: p.legal_name ?? "",
    trading_name: p.trading_name ?? "",
    website_url: p.website_url ?? "",
    kvk_number: p.kvk_number ?? "",
    vat_number: p.vat_number ?? "",
    contact_email: p.contact_email ?? "",
    contact_phone: p.contact_phone ?? "",
    main_contact_name: p.main_contact_name ?? "",
    address_line: p.address_line ?? "",
    postal_code: p.postal_code ?? "",
    city: p.city ?? "",
    country_code: p.country_code ?? "NL",
    preferred_language: p.preferred_language ?? "nl",
    business_category: p.business_category ?? "",
    google_place_id: p.google_place_id ?? "",
    source: p.source === "google" ? "google" : "manual",
  };
}

export default function ComplianceOnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[70vh] place-items-center text-muted" role="status">
          Onboarding wordt geladen…
        </div>
      }
    >
      <ComplianceOnboardingInner />
    </Suspense>
  );
}

function ComplianceOnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { session, ready, refresh } = useSession();
  const { pushToast } = useShopBonus();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [missing, setMissing] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [verifications, setVerifications] = useState<OwnershipVerification[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<OwnershipVerification | null>(null);
  const [emailCode, setEmailCode] = useState("");
  const [mailbox, setMailbox] = useState("info");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [agreement, setAgreement] = useState<MerchantAgreement | null>(null);
  const [acceptChecked, setAcceptChecked] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [signatory, setSignatory] = useState("");
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const user = session?.user;
  const workspaceId =
    user?.workspaces.find((w) => w.is_current)?.id ?? user?.workspaces[0]?.id ?? "current";

  const stepParam = searchParams.get("step");
  const currentKey = useMemo(
    () => clampComplianceStep(stepParam, onboarding?.next_step ?? null),
    [stepParam, onboarding?.next_step]
  );

  // Keep the URL honest when ?step= tries to skip ahead of server progress.
  useEffect(() => {
    if (!onboarding) return;
    const clamped = clampComplianceStep(stepParam, onboarding.next_step);
    if (stepParam !== clamped) {
      router.replace(`/onboarding?step=${clamped}`);
    }
  }, [onboarding, stepParam, router]);

  const setField = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const reload = useCallback(async () => {
    if (!merchantHasShop(user)) return;
    const data = await fetchOnboarding(workspaceId);
    setOnboarding(data);

    if (data.webshop_status === "approved" || hasApprovedWorkspace(user)) {
      router.replace("/dashboard");
      return;
    }

    try {
      const profile = await fetchFullBusinessProfile(workspaceId);
      setForm(profileToForm(profile));
      const stillMissing = profile.missing_fields ?? [];
      setMissing(stillMissing);
      // Incomplete profiles need manual entry; Google Places is optional autofill only.
      if (!profile.google_place_id || stillMissing.length > 0) setManualMode(true);
    } catch {
      /* draft without profile yet */
      setManualMode(true);
    }

    if (data.steps.find((s) => s.key === "ownership")?.status !== "complete") {
      try {
        const list = await listOwnershipVerifications(workspaceId);
        setVerifications(list);
        setActiveChallenge(list.find((v) => v.status === "pending") ?? list[0] ?? null);
      } catch {
        setVerifications([]);
      }
    }

    const agreementNeeded = ["not_started", "outdated", "in_progress"].includes(
      data.steps.find((s) => s.key === "agreement")?.status ?? "not_started"
    );
    if (agreementNeeded || data.next_step === "agreement") {
      try {
        setAgreement(await fetchMerchantAgreement(workspaceId));
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 503)) throw err;
      }
    }
  }, [user, workspaceId, router]);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace(`/account?mode=login&role=merchant&next=${encodeURIComponent("/onboarding")}`);
      return;
    }
    if (!user.email_verified) {
      router.replace("/account?verify=1");
      return;
    }
    if (hasApprovedWorkspace(user)) {
      router.replace("/dashboard");
      return;
    }
    if (!merchantHasShop(user)) {
      router.replace("/voor-webshops/aanmelden");
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          pushToast({
            title: "Onboarding laden mislukt",
            message: formatApiError(err, "Probeer het opnieuw."),
            kind: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, user, reload, router, pushToast]);

  useEffect(() => {
    if (manualMode || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const ac = new AbortController();
      setSearchError(null);
      void searchBusinesses(query.trim(), form.country_code || "NL", ac.signal)
        .then(setSuggestions)
        .catch((err) => {
          setSuggestions([]);
          setSearchError(
            err instanceof ApiError
              ? err.message
              : "Zoeken is tijdelijk niet beschikbaar. Vul handmatig in."
          );
          setManualMode(true);
        });
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query, form.country_code, manualMode]);

  const selectPlace = async (placeId: string) => {
    setSaving(true);
    try {
      const place = await fetchPlaceDetails(placeId);
      setForm((prev) => ({
        ...prev,
        trading_name: place.name ?? prev.trading_name,
        legal_name: place.name ?? prev.legal_name,
        website_url: place.website_url ?? prev.website_url,
        contact_phone: place.phone ?? prev.contact_phone,
        address_line: place.address_line ?? place.formatted_address ?? prev.address_line,
        postal_code: place.postal_code ?? prev.postal_code,
        city: place.city ?? prev.city,
        country_code: place.country_code ?? prev.country_code,
        business_category: place.category ?? prev.business_category,
        google_place_id: place.place_id,
        source: "google",
      }));
      setSuggestions([]);
      setQuery(place.name ?? "");
      pushToast({
        title: "Bedrijf geselecteerd",
        message: "Controleer de gegevens. Dit bewijst geen eigendom.",
        kind: "info",
      });
    } catch (err) {
      pushToast({ title: "Kon details niet laden", message: formatApiError(err, "Probeer handmatig."), kind: "error" });
      setManualMode(true);
    } finally {
      setSaving(false);
    }
  };

  const ensureWorkspace = async () => {
    if (merchantHasShop(user)) return workspaceId;
    const created = await createWorkspace({ name: form.trading_name || form.legal_name || "Mijn webshop" });
    await refresh();
    return created.id;
  };

  const saveDraft = async (confirm: boolean) => {
    setSaving(true);
    try {
      const id = await ensureWorkspace();
      const body: Record<string, unknown> = {
        ...form,
        // Always send a country so NL KvK rules apply consistently.
        country_code: (form.country_code || "NL").toUpperCase(),
        confirm,
      };
      const saved = await saveFullBusinessProfile(body, id);
      setForm(profileToForm(saved));
      setMissing(saved.missing_fields ?? []);
      if (confirm && saved.confirmed) {
        await savePublicProfile(
          {
            display_name: saved.trading_name || saved.legal_name || "Webshop",
            website_url: saved.website_url,
            short_description: null,
            categories: saved.business_category ? [saved.business_category] : [],
          },
          id
        );
        await refresh();
        await reload();
        router.replace(complianceResumePath("ownership", onboarding?.webshop_status ?? "draft"));
        pushToast({ title: "Bedrijfsgegevens bevestigd", message: "Ga verder met eigendomsverificatie.", kind: "success" });
      } else {
        pushToast({ title: "Concept opgeslagen", message: "Je kunt later verdergaan.", kind: "success" });
        await reload();
      }
    } catch (err) {
      const incomplete = missingFieldsFromError(err);
      if (incomplete.length > 0) {
        setMissing(incomplete);
        setManualMode(true);
        pushToast({
          title: "Gegevens incompleet",
          message: `Vul nog in: ${incomplete.join(", ")}`,
          kind: "error",
        });
      } else {
        pushToast({ title: "Opslaan mislukt", message: formatApiError(err, "Controleer de velden."), kind: "error" });
      }
    } finally {
      setSaving(false);
    }
  };

  const startChallenge = async (method: "dns_txt" | "website_file" | "domain_email") => {
    setSaving(true);
    try {
      const v = await startOwnershipVerification(
        method === "domain_email" ? { method, mailbox } : { method },
        workspaceId
      );
      setActiveChallenge(v);
      setVerifications((prev) => [v, ...prev]);
      pushToast({ title: "Challenge gestart", message: "Volg de instructies en controleer daarna.", kind: "success" });
    } catch (err) {
      pushToast({ title: "Verificatie starten mislukt", message: formatApiError(err, "Probeer opnieuw."), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const runCheck = async () => {
    if (!activeChallenge) return;
    setSaving(true);
    try {
      const v = await checkOwnershipVerification(activeChallenge.id, workspaceId);
      setActiveChallenge(v);
      if (v.status === "verified" || v.verified_at) {
        await refresh();
        await reload();
        pushToast({ title: "Eigendom geverifieerd", message: "Je kunt de overeenkomst accepteren.", kind: "success" });
        router.replace("/onboarding?step=agreement");
      } else {
        pushToast({
          title: "Nog niet geverifieerd",
          message: v.failure_reason || "DNS/bestand nog niet gevonden. Probeer later opnieuw.",
          kind: "info",
        });
      }
    } catch (err) {
      pushToast({ title: "Controle mislukt", message: formatApiError(err, "Challenge verlopen of ongeldig."), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const confirmEmail = async () => {
    if (!activeChallenge) return;
    setSaving(true);
    try {
      const v = await confirmOwnershipEmailCode(activeChallenge.id, emailCode.trim(), workspaceId);
      setActiveChallenge(v);
      await refresh();
      await reload();
      pushToast({ title: "E-mail bevestigd", message: "Eigendom is geverifieerd.", kind: "success" });
      router.replace("/onboarding?step=agreement");
    } catch (err) {
      pushToast({ title: "Code ongeldig", message: formatApiError(err, "Controleer de code."), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const submitReview = async () => {
    setSaving(true);
    try {
      await submitOwnershipReview(reviewNotes.trim(), reviewFiles, workspaceId);
      await refresh();
      await reload();
      pushToast({ title: "Review ingediend", message: "Een Super Admin beoordeelt je aanvraag.", kind: "success" });
      router.replace("/onboarding?step=activation");
    } catch (err) {
      pushToast({ title: "Indienen mislukt", message: formatApiError(err, "Probeer opnieuw."), kind: "error" });
    } finally {
      setSaving(false);
    }
  };

  const acceptAgreement = async () => {
    if (!agreement || !acceptChecked || !identityChecked || signatory.trim().length < 2) {
      pushToast({
        title: "Acceptatie onvolledig",
        message: "Vink beide vakjes aan en vul je naam in.",
        kind: "error",
      });
      return;
    }
    setSaving(true);
    try {
      const result = await acceptMerchantAgreement(
        {
          accept: true,
          confirm_identity: true,
          signatory_name: signatory.trim(),
          version: agreement.version,
          document_hash: agreement.document_hash,
        },
        workspaceId
      );
      await refresh();
      if (result.webshop_status === "approved") {
        pushToast({ title: "Workspace geactiveerd", message: "Welkom in je merchant dashboard.", kind: "success" });
        router.replace("/dashboard");
        return;
      }
      await reload();
      pushToast({ title: "Overeenkomst geaccepteerd", message: "Wacht op goedkeuring indien nodig.", kind: "success" });
      router.replace("/onboarding?step=activation");
    } catch (err) {
      pushToast({ title: "Acceptatie mislukt", message: formatApiError(err, "Serverversie kon niet worden bevestigd."), kind: "error" });
      try {
        setAgreement(await fetchMerchantAgreement(workspaceId));
        setAcceptChecked(false);
      } catch {
        /* ignore */
      }
    } finally {
      setSaving(false);
    }
  };

  if (!ready || loading) {
    return (
      <div className="grid min-h-[70vh] place-items-center text-muted" role="status">
        Onboarding wordt geladen…
      </div>
    );
  }

  const status = onboarding?.webshop_status ?? "draft";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(135deg,#f4f8ff_0%,#eef6ff_52%,#f8fbff_100%)]">
      <div className="pointer-events-none absolute inset-0 page-blob opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <Eyebrow>Webshop onboarding</Eyebrow>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-navy sm:text-4xl">
          Activeer je <span className="text-brand">merchant workspace</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
          Zoek je bedrijf, verifieer eigendom, accepteer de merchant-overeenkomst en ontvang toegang.
          Externe bedrijfsgegevens zijn geen bewijs van eigendom.
        </p>

        <div className="mt-8">
          <ComplianceStepper steps={onboarding?.steps ?? []} currentKey={currentKey} />
        </div>

        <section className="mt-8 rounded-3xl border border-blue-100 bg-white/90 p-5 shadow-[0_20px_50px_-30px_rgba(11,116,255,0.35)] sm:p-8">
          {currentKey === "business_details" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-navy">Bedrijf zoeken of handmatig invullen</h2>
                <p className="mt-1 text-sm text-muted">Selecteer een Google-resultaat of vul zelf in. Controleer alles vóór bevestiging.</p>
              </div>

              {!manualMode && (
                <div className="relative">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-bold text-navy">Zoek op handelsnaam of locatie</span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Bijv. Woon & Co Amsterdam"
                      className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                      autoComplete="off"
                    />
                  </label>
                  {suggestions.length > 0 && (
                    <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-blue-100 bg-white p-1.5 shadow-xl">
                      {suggestions.map((s) => (
                        <li key={s.place_id}>
                          <button
                            type="button"
                            onClick={() => void selectPlace(s.place_id)}
                            className="w-full rounded-xl px-3 py-2.5 text-left hover:bg-blue-50"
                          >
                            <span className="block text-sm font-extrabold text-navy">{s.name}</span>
                            <span className="block text-xs text-muted">{s.description}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {searchError && <p className="mt-2 text-sm text-amber-700">{searchError}</p>}
                </div>
              )}

              <button
                type="button"
                onClick={() => setManualMode((v) => !v)}
                className="text-sm font-extrabold text-brand hover:underline"
              >
                {manualMode ? "Toch zoeken via Google Places" : "Handmatig invoeren"}
              </button>

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ["legal_name", "Geregistreerde naam"],
                    ["trading_name", "Handelsnaam"],
                    ["website_url", "Website"],
                    ["kvk_number", "KvK-nummer"],
                    ["vat_number", "BTW-nummer"],
                    ["contact_email", "Zakelijk e-mailadres"],
                    ["contact_phone", "Telefoon"],
                    ["main_contact_name", "Contactpersoon"],
                    ["address_line", "Adres"],
                    ["postal_code", "Postcode"],
                    ["city", "Plaats"],
                    ["country_code", "Landcode"],
                    ["business_category", "Categorie"],
                  ] as const
                ).map(([key, label]) => {
                  const required =
                    (REQUIRED_FIELDS as readonly string[]).includes(key) ||
                    (key === "kvk_number" && (form.country_code || "NL").toUpperCase() === "NL");
                  const highlighted = missing.includes(key);
                  return (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-sm font-bold text-navy">
                      {label}
                      {required && <span className={`ml-1 ${highlighted ? "text-amber-600" : "text-brand"}`}>*</span>}
                    </span>
                    <input
                      value={form[key]}
                      onChange={(e) => setField(key, key === "country_code" ? e.target.value.toUpperCase() : e.target.value)}
                      className={`w-full rounded-xl border bg-white px-4 py-3 text-sm font-medium text-navy outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 ${
                        highlighted ? "border-amber-300 ring-1 ring-amber-200" : "border-blue-100"
                      }`}
                      aria-invalid={highlighted}
                      aria-required={required}
                    />
                  </label>
                  );
                })}
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-navy">Voorkeurstaal</span>
                  <select
                    value={form.preferred_language}
                    onChange={(e) => setField("preferred_language", e.target.value)}
                    className="w-full rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-medium text-navy outline-none focus:border-brand"
                  >
                    <option value="nl">Nederlands</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>

              {missing.length > 0 && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
                  Vul de gemarkeerde verplichte velden in vóór bevestiging
                  {form.country_code?.toUpperCase() === "NL" || !form.country_code
                    ? " (voor NL is ook KvK verplicht)"
                    : ""}
                  : <strong>{missing.join(", ")}</strong>
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft(false)}
                  className="rounded-xl border border-blue-100 bg-white px-5 py-3 text-sm font-extrabold text-navy hover:bg-blue-50 disabled:opacity-60"
                >
                  Concept opslaan
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveDraft(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
                >
                  <DashboardIcon name="check" size={16} />
                  Bevestigen en doorgaan
                </button>
              </div>
            </div>
          )}

          {currentKey === "ownership" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-navy">Eigendom verifiëren</h2>
                <p className="mt-1 text-sm text-muted">
                  Kies DNS, websitebestand, domein-e-mail of handmatige review. Challenges zijn eenmalig en verlopen.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["dns_txt", "DNS TXT-record"],
                    ["website_file", "Websitebestand"],
                    ["domain_email", "Domein-e-mail"],
                  ] as const
                ).map(([method, label]) => (
                  <button
                    key={method}
                    type="button"
                    disabled={saving}
                    onClick={() => void startChallenge(method)}
                    className="rounded-2xl border border-blue-100 bg-blue-50/50 px-4 py-4 text-left text-sm font-extrabold text-navy hover:border-brand hover:bg-blue-50 disabled:opacity-60"
                  >
                    {label}
                  </button>
                ))}
              </div>

              {activeChallenge?.method === "domain_email" && (
                <label className="block max-w-xs">
                  <span className="mb-1.5 block text-sm font-bold text-navy">Mailbox (lokaal deel)</span>
                  <input
                    value={mailbox}
                    onChange={(e) => setMailbox(e.target.value)}
                    placeholder="info"
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-sm outline-none focus:border-brand"
                  />
                </label>
              )}

              {activeChallenge && (
                <div className="rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm">
                  <p className="font-extrabold text-navy">
                    Actieve challenge · {activeChallenge.method} · {activeChallenge.status}
                  </p>
                  {activeChallenge.method === "dns_txt" && (
                    <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-navy">
                      {String(activeChallenge.instructions.record_name ?? "")} TXT{" "}
                      {String(activeChallenge.instructions.record_value ?? "")}
                    </pre>
                  )}
                  {activeChallenge.method === "website_file" && (
                    <div className="mt-3 space-y-2">
                      <p className="text-muted">Plaats dit bestand op:</p>
                      <code className="block rounded-xl bg-white p-3 text-xs">{String(activeChallenge.instructions.url ?? "")}</code>
                      <code className="block rounded-xl bg-white p-3 text-xs">{String(activeChallenge.instructions.file_contents ?? "")}</code>
                    </div>
                  )}
                  {activeChallenge.method === "domain_email" && (
                    <p className="mt-3 text-muted">
                      Code verzonden naar {String(activeChallenge.instructions.sent_to ?? "je domeinmailbox")}.
                    </p>
                  )}
                  {activeChallenge.expires_at && (
                    <p className="mt-2 text-xs text-muted">Verloopt: {new Date(activeChallenge.expires_at).toLocaleString("nl-NL")}</p>
                  )}

                  {(activeChallenge.method === "dns_txt" || activeChallenge.method === "website_file") && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void runCheck()}
                      className="mt-4 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                    >
                      Controleer nu
                    </button>
                  )}
                  {activeChallenge.method === "domain_email" && (
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-bold text-navy">Verificatiecode</span>
                        <input
                          value={emailCode}
                          onChange={(e) => setEmailCode(e.target.value)}
                          className="rounded-xl border border-blue-100 px-3 py-2 text-sm outline-none focus:border-brand"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void confirmEmail()}
                        className="rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white disabled:opacity-60"
                      >
                        Bevestigen
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4">
                <h3 className="font-extrabold text-navy">Handmatige Super Admin review</h3>
                <p className="mt-1 text-sm text-muted">Gebruik dit bij free-mail of wanneer automatische methoden niet mogelijk zijn.</p>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={4}
                  placeholder="Beschrijf waarom jij de eigenaar bent (min. 10 tekens)…"
                  className="mt-3 w-full rounded-xl border border-amber-100 bg-white px-4 py-3 text-sm outline-none focus:border-brand"
                />
                <input
                  type="file"
                  accept=".pdf,image/jpeg,image/png"
                  multiple
                  onChange={(e) => setReviewFiles(Array.from(e.target.files ?? []).slice(0, 5))}
                  className="mt-3 block w-full text-sm"
                />
                <button
                  type="button"
                  disabled={saving || reviewNotes.trim().length < 10}
                  onClick={() => void submitReview()}
                  className="mt-3 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-extrabold text-navy disabled:opacity-60"
                >
                  Review aanvragen
                </button>
              </div>

              {verifications.length > 0 && (
                <ul className="space-y-2 text-xs text-muted">
                  {verifications.slice(0, 5).map((v) => (
                    <li key={v.id}>
                      {v.method} · {v.status}
                      {v.failure_reason ? ` — ${v.failure_reason}` : ""}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {currentKey === "agreement" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-black text-navy">Merchant-overeenkomst</h2>
                <p className="mt-1 text-sm text-muted">
                  Alleen de server-gepubliceerde versie telt. Client-aanpassingen worden geweigerd.
                </p>
              </div>
              {!agreement ? (
                <p className="text-sm text-muted">Er is nog geen gepubliceerde overeenkomst beschikbaar.</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-muted">
                    <span>{agreement.title}</span>
                    <span>v{agreement.version}</span>
                    <span className="font-mono text-[10px]">{agreement.document_hash.slice(0, 12)}…</span>
                  </div>
                  <article className="max-h-[360px] overflow-y-auto rounded-2xl border border-blue-100 bg-slate-50 p-4 text-sm leading-relaxed text-navy whitespace-pre-wrap">
                    {agreement.body}
                  </article>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={acceptChecked}
                      onChange={(e) => setAcceptChecked(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-blue-200"
                    />
                    <span className="font-semibold text-navy">Ik heb de overeenkomst gelezen en ga ermee akkoord.</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={identityChecked}
                      onChange={(e) => setIdentityChecked(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-blue-200"
                    />
                    <span className="font-semibold text-navy">Ik bevestig de juridische/bedrijfsidentiteit van deze webshop.</span>
                  </label>
                  <label className="block max-w-md">
                    <span className="mb-1.5 block text-sm font-bold text-navy">Naam ondertekenaar</span>
                    <input
                      value={signatory}
                      onChange={(e) => setSignatory(e.target.value)}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-sm outline-none focus:border-brand"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={saving || !acceptChecked || !identityChecked}
                    onClick={() => void acceptAgreement()}
                    className="rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-60"
                  >
                    Overeenkomst accepteren
                  </button>
                </>
              )}
            </div>
          )}

          {currentKey === "activation" && (
            <div className="space-y-4">
              <h2 className="text-xl font-black text-navy">Status & volgende stap</h2>
              <p className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-semibold text-navy">
                Workspacestatus: <span className="text-brand">{status}</span>
              </p>
              {status === "pending_review" && (
                <p className="text-sm text-muted">
                  Je aanvraag wacht op Super Admin-beoordeling. Commerciële functies blijven geblokkeerd tot goedkeuring.
                </p>
              )}
              {status === "rejected" && (
                <p className="text-sm text-red-600">Deze webshop is afgewezen. Neem contact op met support voor heropening.</p>
              )}
              {status === "suspended" && (
                <p className="text-sm text-red-600">Deze workspace is geschorst. API-toegang is geblokkeerd.</p>
              )}
              {status === "approved" && (
                <Link href="/dashboard" className="inline-flex rounded-xl bg-brand px-5 py-3 text-sm font-extrabold text-white">
                  Naar dashboard
                </Link>
              )}
              {onboarding?.next_step && onboarding.next_step !== "activation" && (
                <Link
                  href={`/onboarding?step=${onboarding.next_step}`}
                  className="inline-flex text-sm font-extrabold text-brand hover:underline"
                >
                  Ga verder bij: {onboarding.next_step}
                </Link>
              )}
              <div className="pt-2">
                <Link href="/voor-webshops/aanmelden" className="text-sm font-bold text-muted hover:text-brand">
                  Voucher-setup (na goedkeuring) →
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
