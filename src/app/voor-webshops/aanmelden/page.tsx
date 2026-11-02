"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eyebrow } from "@/components/Cards";
import { activateOffer } from "@/lib/merchantOffers";
import { useShopBonus } from "@/store/ShopBonusContext";
import { useSession } from "@/store/SessionContext";
import { hasApprovedWorkspace } from "@/lib/auth";
import {
  ApiError,
  commitCodeImport,
  createOffer,
  createWorkspace,
  fetchOffer,
  fetchCodeImport,
  fetchBusinessProfile,
  fetchOnboarding,
  fetchPublicProfile,
  formatEuroMinor,
  listOffers,
  offerBodyFromForm,
  previewCodeImport,
  saveBusinessProfile,
  savePublicProfile,
  updateOffer,
  uploadCodeImport,
  type ActivationBlocker,
  type CodeImportBatch,
  type CostPreview,
  type OfferPayload,
  type OfferPreview,
  type RegistrationStepKey,
} from "@/lib/onboarding";
import { complianceResumePath } from "@/lib/workspaceCompliance";

type DiscountType = "percentage" | "fixed";

const EMPTY_SHOP = {
  name: "", website: "", categories: [] as string[], description: "", shortDescription: "",
  logoUrl: null as string | null, coverUrl: null as string | null,
};

function bpsToPercent(bps: number): string {
  return String(bps / 100);
}

function minorToEuroInput(minor: number | null | undefined): string {
  if (minor == null) return "";
  return String(Math.round(minor) / 100);
}

export default function VoorWebshopsPage() {
  const router = useRouter();
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("platform");
    if (requested && /^[a-z0-9_]{1,40}$/.test(requested)) {
      sessionStorage.setItem("shopbonus-onboarding-platform", requested);
      queueMicrotask(() => setSelectedIntegration(requested));
    } else {
      queueMicrotask(() => setSelectedIntegration(sessionStorage.getItem("shopbonus-onboarding-platform")));
    }
  }, []);
  const { pushToast } = useShopBonus();
  const { session, ready: sessionReady, refresh } = useSession();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [offerId, setOfferId] = useState<string | null>(null);
  const offerIdRef = useRef<string | null>(null);
  const saveFlight = useRef<Promise<OfferPayload | null> | null>(null);
  const [savedKey, setSavedKey] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [domainLocked, setDomainLocked] = useState(false);
  const [requirementsKnown, setRequirementsKnown] = useState(false);
  const [pollError, setPollError] = useState(false);
  const [localWorkspaceId, setLocalWorkspaceId] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<ActivationBlocker[]>([]);
  const [costPreview, setCostPreview] = useState<CostPreview | null>(null);
  const [serverPreview, setServerPreview] = useState<OfferPreview | null>(null);
  const [importBatch, setImportBatch] = useState<CodeImportBatch | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [shop, setShop] = useState(EMPTY_SHOP);
  const [categoryKeys, setCategoryKeys] = useState<string[]>([]);

  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discount, setDiscount] = useState("10");
  const [minOrder, setMinOrder] = useState("100");
  const [maxDiscount, setMaxDiscount] = useState("10");
  const [claimDays, setClaimDays] = useState("90");
  const [redemptionDays, setRedemptionDays] = useState("90");
  const [terms, setTerms] = useState("Niet combineerbaar met andere acties.");
  const [codes, setCodes] = useState("");
  const [committedCodes, setCommittedCodes] = useState(0);
  const [activated, setActivated] = useState(false);
  const [branchNote, setBranchNote] = useState<string | null>(null);

  const meWorkspaces = session?.user?.workspaces ?? [];
  const workspaceId =
    localWorkspaceId ??
    meWorkspaces.find((w) => w.is_current)?.id ??
    meWorkspaces[0]?.id ??
    "current";
  const apiMode = Boolean(session?.user && (meWorkspaces.length > 0 || localWorkspaceId));

  const goToDashboard = useCallback(async () => {
    if (!session?.user) {
      router.replace(`/account?mode=login&role=merchant&next=${encodeURIComponent("/dashboard")}`);
      return;
    }
    const me = await refresh();
    if (hasApprovedWorkspace(me ?? session.user)) {
      router.replace("/dashboard");
      return;
    }
    router.replace("/onboarding");
  }, [session, refresh, router]);

  const codesFound = useMemo(() => {
    const pasted = codes.split("\n").map((c) => c.trim()).filter(Boolean);
    return new Set(pasted).size;
  }, [codes]);

  const discountNum = Math.max(0, Number(discount) || 0);
  const rewardEstimate =
    discountType === "fixed"
      ? discountNum
      : Math.min(Number(maxDiscount) || discountNum, ((Number(minOrder) || 0) * discountNum) / 100);

  const localBadge =
    discountType === "percentage" ? `${discountNum}% korting` : `€${discountNum} voucher`;
  const localOfferLine =
    discountType === "percentage"
      ? `Vanaf €${minOrder || 0} · Maximaal €${maxDiscount || 0}`
      : `Vanaf €${minOrder || 0}`;

  const journeyHeadline =
    `Besteed minimaal €${minOrder || 0} en verdien €${rewardEstimate.toLocaleString("nl-NL", {
      maximumFractionDigits: 2,
    })} voor je volgende aankoop.`;

  const initials = shop.name
    .split(/[\s&]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 3);

  const categoryLabels = serverPreview?.categories.map((c) => c.label.nl) ?? shop.categories;

  const hydrateFromOffer = useCallback((offer: OfferPayload) => {
    offerIdRef.current = offer.id;
    setOfferId(offer.id);
    setDiscountType(offer.terms.discount_type);
    setDiscount(
      offer.terms.discount_type === "percentage"
        ? bpsToPercent(offer.terms.discount_value)
        : minorToEuroInput(offer.terms.discount_value)
    );
    setMinOrder(minorToEuroInput(offer.terms.min_order_minor) || "0");
    setMaxDiscount(minorToEuroInput(offer.terms.max_discount_minor) || "");
    setClaimDays(String(offer.terms.claim_validity_days ?? 90));
    setRedemptionDays(String(offer.terms.redemption_validity_days ?? 90));
    setTerms(offer.terms.public_description ?? "");
    setCostPreview(offer.cost_preview);
    setServerPreview(offer.preview);
  }, []);

  useEffect(() => {
    if (!sessionReady || !apiMode) {
      return;
    }
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError(false);
      offerIdRef.current = null;
      setOfferId(null);
      setRequirementsKnown(false);
      try {
        const [onboarding, profile, offers, business] = await Promise.all([
          fetchOnboarding(workspaceId),
          fetchPublicProfile(workspaceId),
          listOffers(workspaceId),
          fetchBusinessProfile(workspaceId),
        ]);
        if (cancelled) return;

        const cats = profile.categories ?? [];
        setDomainLocked(business.domain_locked);
        setCategoryKeys(cats);
        setShop({
          name: profile.display_name || "",
          website: profile.website_url || "",
          categories: (profile.categories || []).map((k) => k.replace(/_/g, " ")),
          description: profile.description || "",
          shortDescription: profile.short_description || "",
          logoUrl: profile.logo_url ?? null,
          coverUrl: profile.cover_url ?? null,
        });

        setBranchNote(onboarding.registration.branch_defaults.rationale || null);
        setBlockers(onboarding.registration.activation_blockers || []);
        setRequirementsKnown(true);
        setCommittedCodes(onboarding.registration.available_codes || 0);

        const suggestion = onboarding.registration.branch_defaults.suggestion;
        if (!onboarding.registration.first_offer_id && suggestion) {
          setDiscountType(suggestion.discount_type === "fixed" ? "fixed" : "percentage");
          setDiscount(
            suggestion.discount_type === "percentage"
              ? bpsToPercent(suggestion.discount_value)
              : minorToEuroInput(suggestion.discount_value)
          );
          setMinOrder(minorToEuroInput(suggestion.min_order_minor));
          setMaxDiscount(minorToEuroInput(suggestion.max_discount_minor));
          setClaimDays(String(suggestion.claim_validity_days));
          setRedemptionDays(String(suggestion.redemption_validity_days));
        }

        // Draft setup precedes approval; activation retains all server-side gates.

        const activateDone = onboarding.registration.steps.some(
          (s) => s.key === "activate" && s.status === "complete"
        );
        // Shop already fully set up → merchants always continue on the dashboard.
        if (activateDone && onboarding.webshop_status === "approved") {
          router.replace("/dashboard");
          return;
        }

        const existingId = onboarding.registration.first_offer_id;
        const draft = existingId
          ? await fetchOffer(existingId, workspaceId)
          : offers.find((o) => o.status === "draft") ?? offers[0];
        if (!cancelled) {
          if (draft) hydrateFromOffer(draft);
          try {
            const recovery = JSON.parse(sessionStorage.getItem("onboarding-draft:" + workspaceId) || "null");
            if (recovery && (!recovery.offerId || recovery.offerId === draft?.id)
              && ["percentage", "fixed"].includes(recovery.discountType)
              && ["discount", "minOrder", "maxDiscount", "claimDays", "redemptionDays", "terms", "codes"].every(key => typeof recovery[key] === "string")) {
              setDiscountType(recovery.discountType);
              setDiscount(recovery.discount); setMinOrder(recovery.minOrder); setMaxDiscount(recovery.maxDiscount);
              setClaimDays(recovery.claimDays); setRedemptionDays(recovery.redemptionDays);
              setTerms(recovery.terms); setCodes(recovery.codes);
            }
            const batchId = draft ? sessionStorage.getItem("onboarding-import:" + workspaceId + ":" + draft.id) : null;
            if (batchId) setImportBatch({ id: batchId, status: "committing", source: "recovered", totals: { submitted: 0, valid: 0, invalid: 0, duplicate_in_upload: 0, duplicate_existing: 0 }, rejections: [] });
          } catch { /* Storage may be disabled; server draft remains authoritative. */ }
        }

        const uiStep = onboarding.registration.current_step;
        if (uiStep === "voucher_setup") setStep(2);
        else if (uiStep === "activate") setStep(3);
        else setStep(1);
      } catch (err) {
        if (!cancelled) {
          setLoadError(true);
          const message = err instanceof ApiError ? err.message : "Kon onboarding niet laden.";
          pushToast({ title: "Laden mislukt", message, kind: "error" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally once per session/workspace — avoid toast identity loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionReady, apiMode, workspaceId]);

  const termsBody = offerBodyFromForm({
    name: shop.name + ": " + discount + (discountType === "percentage" ? "%" : " euro") + " volgende aankoop",
    discountType, discount, minOrder, maxDiscount, claimDays, redemptionDays, terms,
  });
  const editKey = JSON.stringify([workspaceId, shop.name, discountType, discount, minOrder, maxDiscount, claimDays, redemptionDays, terms]);
  const latest = useRef({ key: editKey, body: termsBody, workspaceId });
  useLayoutEffect(() => { latest.current = { key: editKey, body: termsBody, workspaceId }; });
  const dirty = apiMode && editKey !== savedKey;

  const persistOffer = useCallback((): Promise<OfferPayload | null> => {
    if (!apiMode) return Promise.resolve(null);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (saveFlight.current) return saveFlight.current;
    setSaving(true);
    setSaveError(null);
    const work = async () => {
      let result: OfferPayload | null = null;
      let persistedKey = "";
      try {
        do {
          const snapshot = latest.current;
          result = offerIdRef.current
            ? await updateOffer(offerIdRef.current, snapshot.body, snapshot.workspaceId)
            : await createOffer({ ...snapshot.body, acquisition: "merchant_reward" }, snapshot.workspaceId);
          if (snapshot.workspaceId !== latest.current.workspaceId) return null;
          persistedKey = snapshot.key;
          // Retain the ID before queued edits can save; a response never rewrites typing.
          offerIdRef.current = result.id;
          setOfferId(result.id);
          if (snapshot.key === latest.current.key) {
            setCostPreview(result.cost_preview);
            setServerPreview(result.preview);
            setSavedKey(snapshot.key);
            const progress = await fetchOnboarding(snapshot.workspaceId);
            if (snapshot.key === latest.current.key) {
              setBlockers(progress.registration.activation_blockers);
              setCommittedCodes(progress.registration.available_codes);
              setRequirementsKnown(true);
            }
          }
        } while (persistedKey !== latest.current.key);
        return result;
      } catch (err) {
        setSaveError(err instanceof ApiError ? err.message : "Opslaan mislukt. Probeer opnieuw.");
        return null;
      } finally {
        setSaving(false);
        saveFlight.current = null;
      }
    };
    saveFlight.current = work();
    return saveFlight.current;
  }, [apiMode]);

  useEffect(() => {
    if (!apiMode || step !== 2 || loading || loadError) return;
    saveTimer.current = setTimeout(() => { void persistOffer(); }, 700);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [editKey, apiMode, step, loading, loadError, persistOffer]);

  useEffect(() => {
    if (!dirty && !saving && !codes.trim()) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (!link || event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (!window.confirm("Er zijn niet-opgeslagen wijzigingen of codes. Deze pagina toch verlaten?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", navigate, true); };
  }, [dirty, saving, codes]);

  // Recover edits even when browser history navigation unmounts the page before autosave.
  useEffect(() => {
    if (!apiMode || loading || loadError || step !== 2) return;
    try {
      const key = "onboarding-draft:" + workspaceId;
      if (dirty || codes.trim()) sessionStorage.setItem(key, JSON.stringify({ offerId, discountType, discount, minOrder, maxDiscount, claimDays, redemptionDays, terms, codes }));
      else sessionStorage.removeItem(key);
    } catch { /* Browser storage is optional; departure warnings still apply. */ }
  }, [apiMode, loading, loadError, step, dirty, workspaceId, offerId, discountType, discount, minOrder, maxDiscount, claimDays, redemptionDays, terms, codes]);

  const refreshRequirements = useCallback(async () => {
    const progress = await fetchOnboarding(workspaceId);
    setBlockers(progress.registration.activation_blockers);
    setCommittedCodes(progress.registration.available_codes);
    setRequirementsKnown(true);
    return progress;
  }, [workspaceId]);

  useEffect(() => {
    if (!importBatch || !["committing", "committed"].includes(importBatch.status) || pollError) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        if (importBatch.status === "committed") { await refreshRequirements(); return; }
        const batch = await fetchCodeImport(importBatch.id, workspaceId);
        if (!cancelled) setImportBatch(batch);
      } catch { if (!cancelled) setPollError(true); }
    }, 1500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [importBatch, workspaceId, refreshRequirements, pollError]);

  useEffect(() => {
    if (!offerId || !importBatch) return;
    try {
      const key = "onboarding-import:" + workspaceId + ":" + offerId;
      if (importBatch.status === "committing") sessionStorage.setItem(key, importBatch.id);
      else sessionStorage.removeItem(key);
    } catch { /* Import continues on the server even when storage is disabled. */ }
  }, [importBatch, offerId, workspaceId]);

  const completeActivation = async () => {
    if (!offerId) return;
    setSaving(true);
    try {
      const progress = await refreshRequirements();
      if (progress.registration.activation_blockers.length > 0) return;
      await activateOffer(offerId, workspaceId);
      setActivated(true);
      await goToDashboard();
    } catch (err) {
      pushToast({ title: "Activatie niet voltooid", message: err instanceof ApiError ? err.message : "Probeer opnieuw.", kind: "error" });
      await refreshRequirements().catch(() => setRequirementsKnown(false));
    } finally { setSaving(false); }
  };

  const saveStep1 = async () => {
    if (!shop.name.trim() || !shop.website.trim()) {
      pushToast({ title: "Vul je gegevens aan", message: "Naam en website zijn verplicht.", kind: "error" });
      return;
    }
    if (!session?.user) {
      pushToast({ title: "Login vereist", message: "Log in als webshop om je aanmelding te starten.", kind: "info" });
      router.push(`/account?mode=login&role=merchant&next=${encodeURIComponent("/voor-webshops/aanmelden")}`);
      return;
    }

    setSaving(true);
    try {
      let wsId = meWorkspaces.find((w) => w.is_current)?.id ?? meWorkspaces[0]?.id ?? localWorkspaceId;
      if (!wsId) {
        const created = await createWorkspace({ name: shop.name.trim(), platform: null });
        wsId = created.id;
        setLocalWorkspaceId(wsId);
        await refresh();
      }

      // Seed draft profile (confirm happens on /onboarding with full address/KvK).
      await saveBusinessProfile(
        {
          legal_name: shop.name.trim(),
          trading_name: shop.name.trim(),
          website_url: shop.website.trim(),
          business_category: categoryKeys[0] || "other",
          contact_email: session.user.email,
          main_contact_name: session.user.first_name,
          country_code: "NL",
          preferred_language: "nl",
          source: "manual",
        },
        wsId
      );

      await savePublicProfile(
        {
          display_name: shop.name.trim(),
          website_url: shop.website.trim(),
          description: shop.description,
          short_description: shop.shortDescription || shop.description.split(".")[0],
          categories: categoryKeys.slice(0, 3),
        },
        wsId
      );
      await refresh();
      pushToast({
        title: "Webshop aangemaakt",
        message: "Stel je eerste voucher in. Goedkeuring is nodig vóór activatie.",
        kind: "success",
      });
      setStep(2);
      return;
    } catch (err) {
      pushToast({
        title: "Opslaan mislukt",
        message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const goActivate = async () => {
    if (discountNum <= 0 || (discountType === "percentage" && discountNum > 100)) {
      pushToast({ title: "Korting ontbreekt", message: "Vul een geldige korting in.", kind: "error" });
      return;
    }
    if (apiMode) {
      const offer = await persistOffer();
      if (!offer) return;
      if (codes.trim()) {
        try {
          setImporting(true);
          const preview = await previewCodeImport(offer.id, codes, workspaceId);
          setImportBatch(preview);
          if (preview.totals.valid > 0) {
            const committed = await commitCodeImport(preview.id, workspaceId);
            setImportBatch(committed);
            setPollError(false);
            setCodes(current => current === codes ? "" : current);
            if (committed.status === "committing") return;
          } else if (committedCodes === 0) {
            pushToast({
              title: "Geen geldige codes",
              message: "Plak of upload minimaal één unieke code, of los dit op in stap 3.",
              kind: "error",
            });
            setImporting(false);
            return;
          }
        } catch (err) {
          pushToast({
            title: "Import mislukt",
            message: err instanceof ApiError ? err.message : "Probeer opnieuw.",
            kind: "error",
          });
          setImporting(false);
          return;
        } finally {
          setImporting(false);
        }
      } else if (committedCodes === 0 && codesFound === 0) {
        pushToast({
          title: "Codes vereist",
          message: "Voeg kortingscodes toe voordat je verdergaat.",
          kind: "error",
        });
        return;
      }
      try { await refreshRequirements(); } catch {
        setRequirementsKnown(false);
        pushToast({ title: "Controle mislukt", message: "Controleer je verbinding en probeer opnieuw.", kind: "error" });
        return;
      }
    } else if (codesFound === 0) {
      pushToast({
        title: "Korting ontbreekt",
        message: "Vul een geldige korting in en voeg minimaal één unieke code toe.",
        kind: "error",
      });
      return;
    }
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onUploadFile = async (file: File) => {
    if (!apiMode) {
      pushToast({ title: "Login vereist", message: "Log in om CSV/Excel te importeren.", kind: "info" });
      return;
    }
    const offer = await persistOffer();
    if (!offer) return;
    setImporting(true);
    try {
      const preview = await uploadCodeImport(offer.id, file, workspaceId);
      setImportBatch(preview);
      pushToast({
        title: "Bestand gecontroleerd",
        message: `${preview.totals.valid} unieke codes gevonden (${preview.totals.invalid} ongeldig, ${preview.totals.duplicate_in_upload + preview.totals.duplicate_existing} dubbel).`,
        kind: "success",
      });
      if (preview.totals.valid > 0) {
        const committed = await commitCodeImport(preview.id, workspaceId);
        setImportBatch(committed);
        setPollError(false);
      }
    } catch (err) {
      pushToast({
        title: "Upload mislukt",
        message: err instanceof ApiError ? err.message : "Ongeldig bestand.",
        kind: "error",
      });
    } finally {
      setImporting(false);
    }
  };

  const fee = !dirty && !saveError ? costPreview?.per_voucher : undefined;
  const displayCodes = committedCodes;
  const importPending = importBatch?.status === "committing";
  const activationReady = apiMode && requirementsKnown && !dirty && !saving && !saveError && !importPending && blockers.length === 0;

  const stepMeta = (n: number, key: RegistrationStepKey) => {
    const done = step > n;
    const current = step === n;
    const labels = { details: "Gegevens", voucher_setup: "Voucher instellen", activate: "Activeren" } as const;
    return {
      n,
      t: labels[key],
      d: done ? "Voltooid" : current ? "Huidige stap" : "Nog te doen",
      done,
      current,
    };
  };

  return (
    <div className="relative overflow-hidden">
      <div className="page-blob left-[-100px] top-[-60px] h-80 w-80 bg-blue-200/50" />
      <div className="page-blob right-[-160px] top-[160px] h-[28rem] w-[28rem] bg-sky-100" />

      <section className="relative mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
          <div>
            <Eyebrow>Stap {step} van 3</Eyebrow>
            {selectedIntegration && <p className="mt-3 text-sm font-bold text-brand">Geselecteerde integratie: {selectedIntegration}. <Link href={"/dashboard/app-store?platform=" + encodeURIComponent(selectedIntegration)}>Bekijk integratie en aansluitvoorwaarden →</Link></p>}
            <h1 className="mt-2 text-[clamp(2.4rem,5vw,3.8rem)] font-black leading-none tracking-tight">
              <span className="text-navy">Je webshop</span>{" "}
              <span className="text-brand">aanmelden</span>
            </h1>
            <p className="mt-4 max-w-md text-lg text-muted">
              {step === 1 && "Vertel ons over je webshop. Vul de gegevens in voor je eerste aanbieding."}
              {step === 2 && "Stel je eerste aanbieding in. Klanten verdienen een voucher voor een latere aankoop."}
              {step === 3 && "Controleer blockers en activeer via de bestaande wallet- en goedkeuringsregels."}
            </p>
          </div>

          <div className="flex items-start gap-0 pt-2">
            {[
              stepMeta(1, "details"),
              stepMeta(2, "voucher_setup"),
              stepMeta(3, "activate"),
            ].map((s, i) => (
              <div key={s.n} className="flex flex-1 items-start">
                <div className="flex flex-col items-center text-center">
                  <button
                    disabled={activated || s.n > step}
                    aria-label={`Stap ${s.n}: ${s.t}`}
                    onClick={() => !activated && s.n < step && setStep(s.n)}
                    className={`grid h-14 w-14 place-items-center rounded-full text-xl font-black transition ${
                      s.done
                        ? "bg-green-600 text-white"
                        : s.current
                          ? "bg-brand text-white ring-4 ring-blue-200"
                          : "bg-blue-50 text-muted"
                    }`}
                  >
                    {s.done ? (
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="m5 13 4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      s.n
                    )}
                  </button>
                  <p className={`mt-2 font-extrabold ${s.done || s.current ? "text-navy" : "text-muted"}`}>
                    {s.n}. {s.t}
                  </p>
                  <p className={`text-sm ${s.current ? "font-bold text-brand" : "text-muted"}`}>{s.d}</p>
                </div>
                {i < 2 && (
                  <div className={`mx-2 mt-7 h-[3px] flex-1 rounded-full ${step > s.n ? "bg-brand" : "bg-blue-100"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {loadError && <p role="alert" className="mt-5">Gegevens konden niet worden geladen. <button className="underline" onClick={() => window.location.reload()}>Opnieuw laden</button></p>}
        {loading && (
          <p className="mt-8 rounded-2xl bg-white p-6 font-semibold text-muted shadow-sm">Gegevens laden…</p>
        )}

        {!loading && !loadError && step === 1 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black text-navy">Webshopgegevens</h2>
              <p className="mt-1 text-muted">Een geverifieerd domein is vergrendeld. Vraag support om een domeinwijziging te beoordelen; eigendom en integratie moeten opnieuw worden geverifieerd.</p>
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Naam webshop</label>
                  <input
                    aria-label="Naam webshop"
                    value={shop.name}
                    onChange={(e) => setShop({ ...shop, name: e.target.value })}
                    className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Website</label>
                  <input
                    disabled={domainLocked}
                    aria-label="Website"
                    value={shop.website}
                    onChange={(e) => setShop({ ...shop, website: e.target.value })}
                    className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Beschrijving</label>
                  <textarea
                    aria-label="Beschrijving"
                    value={shop.description}
                    onChange={(e) => setShop({ ...shop, description: e.target.value })}
                    rows={3}
                    className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => void saveStep1()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-4 font-extrabold text-white hover:bg-brand-dark"
                >
                  Volgende: Voucher instellen
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex flex-col justify-center rounded-[1.75rem] bg-navy p-8 text-white sm:p-10">
              <h3 className="text-2xl font-black">Waarom ShopBonus?</h3>
              <ul className="mt-5 space-y-4">
                {[
                  ["Geen startkosten", "Je betaalt alleen bij daadwerkelijk uitgegeven vouchers."],
                  ["Jij bepaalt", "Zelf aanbiedingen, voorwaarden en looptijd instellen."],
                  ["Volgende aankoop", "Klanten verdienen een voucher; inwisselen gebeurt later."],
                ].map(([t, d]) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand font-black">✓</span>
                    <div>
                      <p className="font-extrabold">{t}</p>
                      <p className="text-sm text-blue-100/70">{d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {!loading && !loadError && step === 2 && <div role="status" aria-live="polite" className="mt-5 rounded-2xl bg-white p-4 text-sm font-bold">
          {saveError ? "Niet opgeslagen: " + saveError : saving ? "Opslaan…" : dirty ? "Niet-opgeslagen wijzigingen · prijsberekening in afwachting" : costPreview?.available === false ? "Concept opgeslagen · prijsberekening niet beschikbaar" : "Concept opgeslagen · prijsberekening bijgewerkt"}
          {saveError && <button className="ml-3 text-brand underline" onClick={() => void persistOffer()}>Opnieuw opslaan</button>}
          {!dirty && costPreview?.available === false && <p>{costPreview.note || costPreview.reason || "Prijsberekening niet beschikbaar. Controleer de aanbiedingsvoorwaarden."}</p>}
          {(dirty || saveError) && <p>Definitieve merchant-kosten worden na succesvol opslaan berekend.</p>}
        </div>}
        {!loading && !loadError && step === 2 && (
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <div className="flex items-start gap-3">
                <span className="grid h-12 w-12 shrink-0 rotate-[-8deg] place-items-center rounded-2xl bg-brand text-xl font-black text-white">
                  %
                </span>
                <div>
                  <h2 className="text-2xl font-black text-navy">Je eerste aanbieding</h2>
                  <p className="text-muted">
                    Klanten verdienen een voucher na een qualifying order — niet meteen korting op die eerste order.
                  </p>
                </div>
              </div>

              {branchNote && (
                <p className="mt-4 rounded-2xl bg-mist/80 px-4 py-3 text-sm font-semibold text-navy">
                  Suggestie voor jouw branche: {branchNote} Je mag alles aanpassen.
                </p>
              )}

              <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 text-sm text-navy">
                <p className="font-extrabold">Klantreis</p>
                <p className="mt-1 font-medium">{journeyHeadline}</p>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted">
                  {([
                        "Klant plaatst een bestelling die aan de voorwaarden voldoet.",
                        "De webshop bevestigt de bestelling.",
                        "Na controle wordt de voucher uitgegeven.",
                        "Klant claimt via een geverifieerd ShopBonus-account.",
                        "Klant wisselt in bij een latere bestelling die aan de voorwaarden voldoet.",
                      ]
                  ).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ol>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Kortingssoort</label>
                  <div className="relative">
                    <select
                      aria-label="Kortingssoort"
                    value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                      className="w-full appearance-none rounded-2xl border border-blue-100 bg-white py-3.5 pl-12 pr-10 font-medium focus:border-brand focus:outline-none"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Vast bedrag</option>
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-brand">%</span>
                    <svg className="absolute right-4 top-1/2 -translate-y-1/2 text-navy" width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Korting</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      aria-label="Korting"
                    value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-full rounded-2xl border border-blue-100 py-3.5 pl-5 pr-14 font-medium focus:border-brand focus:outline-none"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">
                      {discountType === "percentage" ? "%" : "€"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Minimale bestelwaarde</label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      aria-label="Minimale bestelwaarde"
                    value={minOrder}
                      onChange={(e) => setMinOrder(e.target.value)}
                      className="w-full rounded-2xl border border-blue-100 py-3.5 pl-14 pr-4 font-medium focus:border-brand focus:outline-none"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">€</span>
                  </div>
                </div>
                {discountType === "percentage" && (
                  <div>
                    <label className="mb-1.5 block font-bold text-navy">Maximale korting</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        aria-label="Maximale korting"
                    value={maxDiscount}
                        onChange={(e) => setMaxDiscount(e.target.value)}
                        className="w-full rounded-2xl border border-blue-100 py-3.5 pl-14 pr-4 font-medium focus:border-brand focus:outline-none"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 rounded-xl bg-mist px-3 py-1.5 font-black text-muted">€</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Claimtermijn</label>
                  <p className="mb-1 text-xs text-muted">Hoe lang om een uitgegeven voucher te claimen</p>
                  <div className="relative">
                    <select
                      aria-label="Claimtermijn"
                    value={claimDays}
                      onChange={(e) => setClaimDays(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-blue-100 bg-white py-3.5 pl-12 pr-24 font-medium focus:border-brand focus:outline-none"
                    >
                      {["30", "60", "90", "180"].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="absolute right-12 top-1/2 -translate-y-1/2 font-semibold text-navy">dagen</span>
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-bold text-navy">Inwisseltermijn</label>
                  <p className="mb-1 text-xs text-muted">Hoe lang een geclaimde voucher geldig blijft</p>
                  <div className="relative">
                    <select
                      aria-label="Inwisseltermijn"
                    value={redemptionDays}
                      onChange={(e) => setRedemptionDays(e.target.value)}
                      className="w-full appearance-none rounded-2xl border border-blue-100 bg-white py-3.5 pl-12 pr-24 font-medium focus:border-brand focus:outline-none"
                    >
                      {["30", "60", "90", "180"].map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="5" width="18" height="16" rx="2.5" stroke="currentColor" strokeWidth="2" />
                        <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </span>
                    <span className="absolute right-12 top-1/2 -translate-y-1/2 font-semibold text-navy">dagen</span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block font-bold text-navy">Aanvullende voorwaarden (tekst)</label>
                <div className="relative">
                  <textarea
                    aria-label="Aanvullende voorwaarden"
                    value={terms}
                    maxLength={500}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-blue-100 px-5 py-3.5 font-medium focus:border-brand focus:outline-none"
                  />
                  <span className="absolute bottom-3 right-4 text-xs font-semibold text-muted">{terms.length}/500</span>
                </div>
                <p className="mt-1 text-xs text-muted">Beschrijvende tekst overschrijft geen backend eligibility-checks.</p>
              </div>

              {fee && (
                <div className="mt-4 rounded-2xl bg-mist/70 p-4 text-sm">
                  <p className="font-extrabold text-navy">Geschatte merchant-kosten (geen afschrijving)</p>
                  <dl className="mt-2 space-y-1 text-navy">
                    <div className="flex justify-between gap-3">
                      <dt>Klantvoucher</dt>
                      <dd className="font-bold">{fee ? formatEuroMinor(fee.reward_minor) : `€${rewardEstimate}`}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt>ShopBonus-fee ({((costPreview?.fee_rate_bps ?? 3000) / 100).toFixed(0)}%)</dt>
                      <dd className="font-bold">{fee ? formatEuroMinor(fee.fee_minor) : `€${(rewardEstimate * 0.3).toFixed(2)}`}</dd>
                    </div>
                    <div className="flex justify-between gap-3 border-t border-blue-100 pt-1">
                      <dt className="font-extrabold">Totale commitment</dt>
                      <dd className="font-black text-brand">
                        {fee ? formatEuroMinor(fee.merchant_commitment_minor) : `€${(rewardEstimate * 1.3).toFixed(2)}`}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs text-muted">
                    {costPreview?.note ||
                      "Preview only. Niets wordt afgerekend door het invullen van de aanbieding."}
                    {saving ? " · Opslaan…" : ""}
                  </p>
                </div>
              )}

              <div className="mt-4 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-5 text-center">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-brand">
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
                      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                      <path d="M14 3v5h5M12 11v6M9 14h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-3.5 py-1.5 text-sm font-extrabold text-green-700">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="currentColor" />
                      <path d="m8 12.5 2.7 2.7L16 10" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {displayCodes} codes beschikbaar
                  </span>
                </div>
                <p className="mt-2 font-extrabold text-navy">Plak codes of upload Excel/CSV</p>
                <p className="text-sm text-muted">
                  Unieke codes in inventaris. Checkout-compatibiliteit vereist aparte verificatie.
                </p>
                <textarea
                  aria-label="Kortingscodes"
                    value={codes}
                  onChange={(e) => setCodes(e.target.value)}
                  placeholder={"CODE-AAAA\nCODE-BBBB\n…"}
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-blue-100 bg-white px-4 py-3 font-mono text-sm focus:border-brand focus:outline-none"
                />
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.xlsx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUploadFile(f);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    disabled={importing || importPending}
                    onClick={() => fileRef.current?.click()}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-brand shadow-sm hover:bg-mist disabled:opacity-60"
                  >
                    {importing ? "Bezig…" : "Upload CSV / Excel"}
                  </button>
                  {importBatch && (
                    <span className="text-xs font-semibold text-muted">
                      Batch {importBatch.id.slice(0, 8)} · {importBatch.status}
                      {importBatch.totals.invalid ? ` · ${importBatch.totals.invalid} ongeldig` : ""}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted">{codesFound} geplakte codes nog niet geïmporteerd. Automatisch genereren is voor deze integraties niet beschikbaar.</p>
                {importPending && <p role="status">Import wordt verwerkt. Voorraad wordt na bevestiging bijgewerkt.</p>}
                {importBatch?.status === "failed" && <p role="alert">Import mislukt. Controleer je codes en start een nieuwe import.</p>}
                {pollError && <button className="text-brand underline" onClick={() => setPollError(false)}>Importstatus ophalen mislukt — opnieuw controleren</button>}
                {committedCodes > 0 && (
                  <p className="mt-2 text-xs font-bold text-amber-700">Verification required — codes zijn nog niet checkout-geverifieerd.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] bg-white/70 p-7 shadow-sm backdrop-blur sm:p-8">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
                <div>
                  <h2 className="text-2xl font-black text-navy">Live preview van je voucher</h2>
                  <p className="mt-1 text-muted">Concept — niet openbaar tot activatie.</p>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold ${activationReady ? "bg-mint text-green-700" : "bg-amber-50 text-amber-800"}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${activationReady ? "bg-green-600" : "bg-amber-600"}`} /> {activationReady ? "Klaar om te activeren" : dirty || saving ? "Wacht op opslaan" : importPending ? "Import wordt verwerkt" : "Activatiepunten open"}
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-3xl bg-white shadow-md">
                <div className="relative">
                  {shop.coverUrl ? <img src={shop.coverUrl} onError={() => setShop(current => ({ ...current, coverUrl: null }))} alt="Omslag webshop" className="h-44 w-full object-cover" /> : <div className="grid h-44 place-items-center bg-mist text-muted">Nog geen omslagafbeelding</div>}
                  <span className="absolute right-4 top-4 rounded-2xl bg-green-100/95 px-4 py-2 text-lg font-black text-green-700 shadow">
                    {localBadge}
                  </span>
                </div>
                <div className="flex items-center gap-4 p-5">
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#f6f1e8] text-lg font-black">
                    {shop.logoUrl ? <img src={shop.logoUrl} onError={() => setShop(current => ({ ...current, logoUrl: null }))} alt={"Logo " + shop.name} className="h-16 w-16 rounded-full object-contain" /> : initials || "Logo ontbreekt"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-lg font-black text-navy">{shop.name || "Jouw webshop"}</p>
                    <p className="truncate text-sm text-muted">
                      {shop.shortDescription || shop.description.split(".")[0] || "Beschrijving ontbreekt"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {categoryLabels.length === 0 && <span className="text-xs text-muted">Categorieën ontbreken</span>}
                      {categoryLabels.map((c) => (
                        <span key={c} className="rounded-full bg-mist px-3 py-0.5 text-xs font-bold text-navy">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="hidden items-center gap-2 rounded-2xl bg-brand-light/60 px-4 py-3 sm:flex">
                    <span className="grid h-10 w-10 rotate-[-8deg] place-items-center rounded-xl bg-brand text-base font-black text-white">
                      %
                    </span>
                    <div>
                      <p className="text-lg font-black leading-none text-brand">{localBadge}</p>
                      <p className="mt-1 text-xs font-bold text-navy">{localOfferLine}</p>
                    </div>
                  </div>
                </div>
                <div className="border-t border-blue-50 px-5 py-4 text-sm text-navy">
                  <p className="font-extrabold">Op je volgende aankoop</p>
                  <p className="mt-1 text-muted">{journeyHeadline}</p>
                  <p className="mt-2 text-xs text-muted">
                    Claim: {claimDays} dagen · Inwisselen: {redemptionDays} dagen
                    {terms ? ` · ${terms}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-black text-navy">Webshopgegevens</h3>
                  <button onClick={() => setStep(1)} className="flex items-center gap-1.5 text-sm font-bold text-brand hover:underline">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17l-1 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                    </svg>
                    Bewerken
                  </button>
                </div>
                <p className="text-sm text-muted">Controleer gegevens vóór activatie. Automatische suggesties zijn niet blind te vertrouwen.</p>
                <dl className="mt-3 space-y-2.5 rounded-2xl bg-white p-5 text-[15px] shadow-sm">
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted">Naam</dt>
                    <dd className="font-bold text-navy">{shop.name}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted">Website</dt>
                    <dd className="font-bold text-brand">{shop.website || "Website ontbreekt"}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted">Categorieën</dt>
                    <dd className="flex flex-wrap gap-1.5">
                      {categoryLabels.map((c) => (
                        <span key={c} className="rounded-full bg-mist px-3 py-0.5 text-sm font-bold text-navy">
                          {c}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="w-32 shrink-0 text-muted">Beschrijving</dt>
                    <dd className="text-navy">{shop.description || "Beschrijving ontbreekt"}</dd>
                  </div>
                </dl>
              </div>

              <button
                onClick={() => void goActivate()}
                disabled={importing || saving || importPending}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-[16px] font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(11,116,255,0.7)] hover:bg-brand-dark disabled:opacity-60"
              >
                Volgende: Activeren
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {!loading && !loadError && step === 3 && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[1.75rem] bg-white p-7 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black text-navy">Controleer je aanmelding</h2>
              <div className="mt-5 space-y-3">
                {[
                  ["Webshop", shop.name],
                  ["Website", shop.website],
                  ["Aanbieding", `${localBadge} — ${localOfferLine}`],
                  ["Claim / inwisselen", `${claimDays} / ${redemptionDays} dagen`],
                  ["Voorwaarden", terms || "—"],
                  ["Codes", `${committedCodes} codes beschikbaar (verificatie vereist)`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 rounded-2xl bg-mist/70 px-5 py-3.5">
                    <span className="font-bold text-muted">{k}</span>
                    <span className="text-right font-extrabold text-navy">{v}</span>
                  </div>
                ))}
              </div>

              {blockers.length > 0 && (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="font-extrabold text-amber-900">Nog nodig vóór activatie</p>
                  <ul className="mt-2 space-y-1 text-sm text-amber-900">
                    {blockers.map((b) => (
                      <li key={b.code}>• {b.message}{" "}
                        {b.code.startsWith("offer_") || b.code === "codes_missing" ? <button className="underline" onClick={() => setStep(2)}>Voucher aanpassen</button> : <Link className="underline" href={b.code === "funding_insufficient" ? "/dashboard#wallet" : b.code === "connection_unverified" ? "/dashboard/app-store" : complianceResumePath(b.code === "webshop_unverified" ? "ownership" : "activation", "draft")}>Nu oplossen</Link>}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-amber-800">
                    Je concept is opgeslagen. Stap 2 activeert de aanbieding niet automatisch.
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={saving || !activationReady}
                onClick={() => void completeActivation()}
                className="mt-5 w-full rounded-2xl bg-green-600 py-4 font-extrabold text-white shadow-lg transition hover:bg-green-700 disabled:opacity-60"
              >
                {saving || activated ? "Activeren…" : "Aanbieding activeren en naar dashboard →"}
              </button>
              <button className="mt-3 font-bold text-brand underline" onClick={() => void refreshRequirements().catch(() => setRequirementsKnown(false))}>Activatiepunten opnieuw controleren</button>
              {blockers.length > 0 && (
                <p className="mt-3 text-center text-xs text-muted">
                  Je concept is opgeslagen. Los de punten op en controleer opnieuw.
                </p>
              )}
            </div>
            <div className="overflow-hidden rounded-[1.75rem] bg-navy p-8 text-white sm:p-10">
              <h3 className="text-2xl font-black">Wat gebeurt er na activatie?</h3>
              <div className="mt-6 space-y-5">
                {[
                  ["Draft blijft concept", "Tot echte activatie blijft de voucher privé en niet vindbaar."],
                  ["Funding & wallet", "Merchant wallet dekt reward + ShopBonus-fee per voucher."],
                  ["Order adapter", "Eligible orders lopen via de bestaande Universal Order Adapter."],
                ].map(([t, d], i) => (
                  <div key={t} className="flex gap-4">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand font-black">{i + 1}</span>
                    <div>
                      <p className="font-extrabold">{t}</p>
                      <p className="text-sm text-blue-100/70">{d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
