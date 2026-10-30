"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import DashboardIcon from "@/components/DashboardIcon";
import { DashboardHeading, DashboardStatCard, Panel, StatusPill } from "@/components/DashboardPrimitives";
import { useShopBonus } from "@/store/ShopBonusContext";
import { useWorkspace } from "@/store/WorkspaceContext";
import { apiUrl, env } from "@/config/env";
import {
  activateOffer,
  acquisitionHint,
  acquisitionLabel,
  archiveOffer,
  assignedLabel,
  commitCodeImport,
  costPreviewLine,
  createOffer,
  codeStatusLabel,
  duplicateOffer,
  endOffer,
  exportCodesUrl,
  fetchCodeHistory,
  fetchOfferCodes,
  formatAddedAt,
  formatDiscount,
  formatOfferMoney,
  importTemplateUrl,
  invalidateCode,
  listOffers,
  offerBodyFromForm,
  offerStatusLabel,
  pauseOffer,
  platformValidationLabel,
  previewCodeImport,
  publishOffer,
  resumeOffer,
  revealCode,
  summaryCounters,
  updateOffer,
  uploadCodeImport,
  verifyCodePlatform,
  ApiError,
  type CodeImportBatch,
  type CodeHistoryEvent,
  type InventoryCode,
  type OfferPayload,
} from "@/lib/merchantOffers";

const PAGE_SIZE = 7;

function offerLife(offer: OfferPayload): string {
  return offer.lifecycle_status || offer.status;
}

function offerAllows(offer: OfferPayload, action: string): boolean {
  if (offer.allowed_actions) return offer.allowed_actions.includes(action);
  switch (action) {
    case "edit":
    case "import_codes":
      return offer.status !== "ended" && offer.status !== "archived";
    case "pause":
      return offer.status === "active";
    case "resume":
      return offer.status === "paused";
    case "publish":
    case "activate":
      return offer.status === "draft" || offer.status === "scheduled";
    case "duplicate":
      return true;
    default:
      return false;
  }
}

function MerchantOffersPage() {
  const params = useSearchParams();
  const { pushToast } = useShopBonus();
  const { workspaceId, revision, current } = useWorkspace();
  const offerParam = params.get("offer");
  const inventoryParam = params.get("inventory");
  const offerStatusParam = params.get("status");
  const focusParam = params.get("focus");
  const openNewParam = params.has("new");

  const [offers, setOffers] = useState<OfferPayload[]>([]);
  const [selectedOfferId, setSelectedOfferId] = useState(offerParam || "");
  const [codes, setCodes] = useState<InventoryCode[]>([]);
  const [counters, setCounters] = useState<ReturnType<typeof summaryCounters> | null>(null);
  const [rawCounters, setRawCounters] = useState<Parameters<typeof summaryCounters>[0]>(null);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, from: 0, to: 0 });
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(inventoryParam === "available" ? "available" : "all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [offerListFilter, setOfferListFilter] = useState(() => {
    if (offerStatusParam === "ended" || offerStatusParam === "expired") return "expired";
    if (
      offerStatusParam === "active" ||
      offerStatusParam === "paused" ||
      offerStatusParam === "draft" ||
      offerStatusParam === "scheduled" ||
      offerStatusParam === "archived" ||
      offerStatusParam === "sold_out"
    ) {
      return offerStatusParam;
    }
    return "all";
  });
  const [offerQuery, setOfferQuery] = useState("");
  const [savedPreview, setSavedPreview] = useState<OfferPayload["preview"]>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const queryHintHandled = useRef("");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"new" | "edit" | "paste" | "history" | null>(openNewParam ? "new" : null);
  const [pasteValue, setPasteValue] = useState("");
  const [importPreview, setImportPreview] = useState<CodeImportBatch | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [history, setHistory] = useState<CodeHistoryEvent[]>([]);
  const [historyCode, setHistoryCode] = useState<InventoryCode | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    acquisition: "merchant_reward" as string,
    type: "percentage" as "percentage" | "fixed",
    value: "",
    minimum: "",
    maximum: "",
    claimDays: "90",
    redemptionDays: "90",
    condition: "",
    combinable: false,
  });
  const fileRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 250);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [query]);

  const loadOffers = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingOffers(true);
      setError(null);
      try {
        const rows = await listOffers(workspaceId);
        if (signal?.aborted) return;
        setOffers(rows);
        setSelectedOfferId((prev) => {
          if (offerParam && rows.some((o) => o.id === offerParam)) return offerParam;
          if (prev && rows.some((o) => o.id === prev)) return prev;
          return rows[0]?.id ?? "";
        });
      } catch (err) {
        if (signal?.aborted) return;
        setError(err instanceof ApiError ? err.message : "Aanbiedingen konden niet worden geladen.");
        setOffers([]);
      } finally {
        if (!signal?.aborted) setLoadingOffers(false);
      }
    },
    [workspaceId, offerParam]
  );

  const loadCodes = useCallback(
    async (signal?: AbortSignal) => {
      if (!selectedOfferId) {
        setCodes([]);
        setCounters(null);
        setRawCounters(null);
        return;
      }
      setLoadingCodes(true);
      try {
        const pageData = await fetchOfferCodes(
          selectedOfferId,
          workspaceId,
          {
            search: debouncedQuery || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            batch: batchFilter === "all" ? undefined : batchFilter,
            platform_validation: platformFilter === "all" ? undefined : platformFilter,
            assigned:
              assignedFilter === "all" ? undefined : assignedFilter === "assigned" ? true : false,
            per_page: PAGE_SIZE,
            page,
            sort: "-created_at",
          },
          signal
        );
        if (signal?.aborted) return;
        setCodes(pageData.data);
        setRawCounters(pageData.meta.counters);
        setCounters(summaryCounters(pageData.meta.counters));
        setMeta({
          current_page: pageData.meta.current_page,
          last_page: pageData.meta.last_page,
          total: pageData.meta.total,
          from: pageData.meta.from ?? 0,
          to: pageData.meta.to ?? 0,
        });
      } catch (err) {
        if (signal?.aborted) return;
        pushToast({
          title: "Codes laden mislukt",
          message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
          kind: "error",
        });
      } finally {
        if (!signal?.aborted) setLoadingCodes(false);
      }
    },
    [
      selectedOfferId,
      workspaceId,
      debouncedQuery,
      statusFilter,
      batchFilter,
      platformFilter,
      assignedFilter,
      page,
      pushToast,
    ]
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadOffers(ac.signal);
    return () => ac.abort();
  }, [loadOffers, revision]);

  useEffect(() => {
    const ac = new AbortController();
    void loadCodes(ac.signal);
    return () => ac.abort();
  }, [loadCodes, revision]);

  useEffect(() => {
    if (inventoryParam === "available") setStatusFilter("available");
  }, [inventoryParam]);

  useEffect(() => {
    const key = `${focusParam ?? ""}|${inventoryParam ?? ""}`;
    if (queryHintHandled.current === key) return;
    if (!focusParam && inventoryParam !== "upload") return;
    queryHintHandled.current = key;
    window.setTimeout(() => {
      document.getElementById("code-inventory")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
    if (focusParam === "issued") {
      pushToast({
        title: "Uitgegeven vouchers",
        message: "Het volledige overzicht staat bij Vouchers.",
        kind: "info",
      });
    } else if (focusParam === "claims") {
      pushToast({
        title: "Claims",
        message: "De codevoorraad staat hieronder. Geclaimde vouchers bekijk je bij Vouchers.",
        kind: "info",
      });
    } else if (inventoryParam === "upload") {
      pushToast({
        title: "Codes uploaden",
        message: "Download het sjabloon of upload een CSV voor de geselecteerde aanbieding.",
        kind: "info",
      });
    }
  }, [focusParam, inventoryParam, pushToast]);

  const visibleOffers = useMemo(() => {
    const q = offerQuery.trim().toLowerCase();
    return offers.filter((offer) => {
      const life = offerLife(offer);
      if (offerListFilter !== "all") {
        const match =
          offerListFilter === "expired"
            ? life === "expired" || offer.status === "ended" || offer.status === "expired"
            : life === offerListFilter;
        if (!match) return false;
      }
      if (!q) return true;
      return (
        (offer.terms.name ?? "").toLowerCase().includes(q) ||
        (offer.terms.summary ?? "").toLowerCase().includes(q)
      );
    });
  }, [offers, offerListFilter, offerQuery]);

  const selectedOffer = offers.find((o) => o.id === selectedOfferId) ?? visibleOffers[0] ?? null;

  useEffect(() => {
    setSelectedCodes([]);
    setPage(1);
  }, [selectedOfferId]);

  const batches = useMemo(() => {
    const ids = new Set<string>();
    codes.forEach((c) => {
      if (c.batch_id) ids.add(c.batch_id);
    });
    if (batchFilter !== "all") ids.add(batchFilter);
    return Array.from(ids);
  }, [codes, batchFilter]);

  const openNew = () => {
    setForm({
      title: "",
      acquisition: "merchant_reward",
      type: "percentage",
      value: "10",
      minimum: "100",
      maximum: "10",
      claimDays: "90",
      redemptionDays: "90",
      condition: "",
      combinable: false,
    });
    setSavedPreview(null);
    setModal("new");
  };

  const openEdit = () => {
    if (!selectedOffer) return;
    const t = selectedOffer.terms;
    setForm({
      title: t.name,
      acquisition: selectedOffer.acquisition,
      type: t.discount_type,
      value:
        t.discount_type === "percentage"
          ? String(t.discount_value / 100)
          : String((t.discount_value ?? 0) / 100),
      minimum: t.min_order_minor != null ? String(t.min_order_minor / 100) : "",
      maximum: t.max_discount_minor != null ? String(t.max_discount_minor / 100) : "",
      claimDays: String(t.claim_validity_days ?? 90),
      redemptionDays: String(t.redemption_validity_days ?? 90),
      condition: t.public_description ?? "",
      combinable: Boolean(t.combinable),
    });
    setSavedPreview(null);
    setModal("edit");
  };

  const saveOffer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      pushToast({ title: "Controleer de aanbieding", message: "Vul een naam in.", kind: "error" });
      return;
    }
    setSaving(true);
    try {
      const body = offerBodyFromForm({
        name: form.title.trim(),
        discountType: form.type,
        discount: form.value,
        minOrder: form.minimum,
        maxDiscount: form.maximum,
        claimDays: form.claimDays,
        redemptionDays: form.redemptionDays,
        terms: form.condition,
        combinable: form.combinable,
      });
      let saved: OfferPayload;
      if (modal === "edit" && selectedOffer) {
        saved = await updateOffer(selectedOffer.id, body, workspaceId);
        setOffers((prev) => prev.map((o) => (o.id === saved.id ? saved : o)));
        pushToast({
          title: "Aanbieding bijgewerkt",
          message: saved.terms.locked
            ? `Versie ${saved.terms.version} vastgelegd. Uitgegeven vouchers behouden hun oorspronkelijke voorwaarden.`
            : "Je wijzigingen zijn opgeslagen.",
          kind: "success",
        });
      } else {
        saved = await createOffer({ ...body, acquisition: form.acquisition }, workspaceId);
        setOffers((prev) => [saved, ...prev]);
        setSelectedOfferId(saved.id);
        pushToast({ title: "Aanbieding aangemaakt", message: "Opgeslagen als concept.", kind: "success" });
      }
      if (saved.preview) setSavedPreview(saved.preview);
      else {
        setSavedPreview(null);
        setModal(null);
      }
    } catch (err) {
      pushToast({
        title: "Opslaan mislukt",
        message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const runOfferAction = async (
    action: "publish" | "pause" | "resume" | "activate" | "archive" | "duplicate" | "end"
  ) => {
    if (!selectedOffer) return;
    if (action === "archive" && !window.confirm("Deze aanbieding archiveren?")) return;
    if (action === "end" && !window.confirm("Deze aanbieding beëindigen?")) return;
    setActionBusy(action);
    try {
      const updated = await (
        action === "publish"
          ? publishOffer
          : action === "pause"
            ? pauseOffer
            : action === "resume"
              ? resumeOffer
              : action === "archive"
                ? archiveOffer
                : action === "duplicate"
                  ? duplicateOffer
                  : action === "end"
                    ? endOffer
                    : activateOffer
      )(selectedOffer.id, workspaceId);
      if (action === "duplicate") {
        setOffers((prev) => [updated, ...prev.filter((offer) => offer.id !== updated.id)]);
        setSelectedOfferId(updated.id);
      } else {
        setOffers((prev) => prev.map((offer) => (offer.id === updated.id ? updated : offer)));
      }
      pushToast({
        title: action === "duplicate" ? "Aanbieding gedupliceerd" : "Aanbieding bijgewerkt",
        message: `${updated.terms.name} is nu ${offerStatusLabel(offerLife(updated)).toLowerCase()}.`,
        kind: "success",
      });
    } catch (err) {
      pushToast({
        title: "Actie mislukt",
        message: err instanceof ApiError ? err.message : "Controleer funding en verplichte velden.",
        kind: "error",
      });
    } finally {
      setActionBusy(null);
    }
  };

  const runPastePreview = async () => {
    if (!selectedOfferId || !pasteValue.trim()) {
      pushToast({ title: "Geen codes gevonden", message: "Plak één voucher-code per regel.", kind: "error" });
      return;
    }
    setImportBusy(true);
    try {
      const preview = await previewCodeImport(selectedOfferId, pasteValue, workspaceId);
      setImportPreview(preview);
    } catch (err) {
      pushToast({
        title: "Importpreview mislukt",
        message: err instanceof ApiError ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    } finally {
      setImportBusy(false);
    }
  };

  const commitPreview = async () => {
    if (!importPreview) return;
    setImportBusy(true);
    try {
      const committed = await commitCodeImport(importPreview.id, workspaceId);
      pushToast({
        title: `${committed.totals.imported ?? 0} codes toegevoegd`,
        message: `Batch ${committed.id.slice(-6).toUpperCase()} · afgewezen: ${(committed.totals.invalid ?? 0) + (committed.totals.duplicate_in_upload ?? 0) + (committed.totals.duplicate_existing ?? 0)}.`,
        kind: "success",
      });
      setPasteValue("");
      setImportPreview(null);
      setModal(null);
      await loadCodes();
    } catch (err) {
      pushToast({
        title: "Import mislukt",
        message: err instanceof ApiError ? err.message : "Geen codes opgeslagen.",
        kind: "error",
      });
    } finally {
      setImportBusy(false);
    }
  };

  const handleUpload = async (file?: File) => {
    if (!file || !selectedOfferId) return;
    setImportBusy(true);
    try {
      const preview = await uploadCodeImport(selectedOfferId, file, workspaceId);
      setImportPreview(preview);
      setModal("paste");
      pushToast({
        title: "Bestand gecontroleerd",
        message: `${preview.totals.valid} geldig · ${preview.totals.invalid} ongeldig · ${preview.totals.duplicate_in_upload + preview.totals.duplicate_existing} duplicaten.`,
        kind: "info",
      });
    } catch (err) {
      pushToast({
        title: "Upload geweigerd",
        message: err instanceof ApiError ? err.message : "Gebruik CSV/TXT (geen legacy XLS).",
        kind: "error",
      });
    } finally {
      setImportBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const exportCodes = async () => {
    if (!selectedOfferId) return;
    try {
      const path = exportCodesUrl(selectedOfferId, workspaceId, {
        status: statusFilter === "all" ? undefined : statusFilter,
        batch: batchFilter === "all" ? undefined : batchFilter,
        search: debouncedQuery || undefined,
        platform_validation: platformFilter === "all" ? undefined : platformFilter,
      });
      const res = await fetch(apiUrl(path), {
        credentials: env.useCookieAuth ? "include" : "same-origin",
        headers: { Accept: "text/csv" },
      });
      if (!res.ok) throw new Error("Export geweigerd");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `shopbonus-codes-${selectedOfferId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      pushToast({ title: "Export gestart", message: "Gefilterde codevoorraad gedownload.", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Export mislukt",
        message: err instanceof Error ? err.message : "Geen exportrechten of serverfout.",
        kind: "error",
      });
    }
  };

  const downloadTemplate = async () => {
    if (!selectedOfferId) return;
    try {
      const res = await fetch(apiUrl(importTemplateUrl(selectedOfferId, workspaceId)), {
        credentials: env.useCookieAuth ? "include" : "same-origin",
        headers: { Accept: "text/csv" },
      });
      if (!res.ok) throw new Error("Sjabloon geweigerd");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "code-import-template.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      pushToast({
        title: "Sjabloon niet beschikbaar",
        message: err instanceof Error ? err.message : "Probeer het opnieuw.",
        kind: "error",
      });
    }
  };

  const copyCode = async (row: InventoryCode) => {
    try {
      const revealed = await revealCode(row.id, workspaceId);
      await navigator.clipboard?.writeText(revealed.code);
      pushToast({ title: "Code gekopieerd", message: "Volledige code staat op je klembord (geaudit).", kind: "success" });
    } catch (err) {
      pushToast({
        title: "Kopiëren niet toegestaan",
        message: err instanceof ApiError ? err.message : "Geen reveal-rechten.",
        kind: "error",
      });
    }
  };

  const openHistory = async (row: InventoryCode) => {
    try {
      const events = await fetchCodeHistory(row.id, workspaceId);
      setHistoryCode(row);
      setHistory(events);
      setModal("history");
    } catch (err) {
      pushToast({
        title: "Geschiedenis niet beschikbaar",
        message: err instanceof ApiError ? err.message : "Probeer later opnieuw.",
        kind: "error",
      });
    }
  };

  const verifyRow = async (row: InventoryCode) => {
    try {
      const result = await verifyCodePlatform(row.id, workspaceId, { mode: "provider_check" });
      setCodes((prev) => prev.map((c) => (c.id === row.id ? result.data : c)));
      pushToast({
        title: platformValidationLabel(result.data.platform_validation),
        message: String(result.verification.detail.message ?? result.verification.detail.reason ?? ""),
        kind: result.data.platform_validation === "verified" ? "success" : "info",
      });
      await loadCodes();
    } catch (err) {
      pushToast({
        title: "Platformcheck mislukt",
        message: err instanceof ApiError ? err.message : "Probeer handmatige bevestiging.",
        kind: "error",
      });
    }
  };

  const invalidateSelected = async () => {
    if (!selectedCodes.length) return;
    if (!window.confirm(`Maak ${selectedCodes.length} beschikbare code(s) ongeldig? Dit wordt geaudit.`)) return;
    const reason = window.prompt("Reden (min. 3 tekens)", "Niet geaccepteerd in kassa");
    if (!reason || reason.trim().length < 3) return;
    let ok = 0;
    for (const id of selectedCodes) {
      try {
        await invalidateCode(id, workspaceId, reason.trim());
        ok += 1;
      } catch {
        /* conflict for non-available codes */
      }
    }
    setSelectedCodes([]);
    pushToast({
      title: `${ok} codes ongeldig`,
      message: ok < selectedCodes.length ? "Alleen beschikbare codes kunnen worden geïnvalideerd." : "Audit vastgelegd.",
      kind: ok ? "success" : "error",
    });
    await loadCodes();
  };

  const stats = [
    { label: "Totaal codes", value: (counters?.total ?? 0).toLocaleString("nl-NL"), icon: "ticket" as const, tone: "blue" as const },
    { label: "Beschikbaar", value: (counters?.available ?? 0).toLocaleString("nl-NL"), icon: "check" as const, tone: "green" as const },
    {
      label: "Gereserveerd / uitgegeven",
      value: (counters?.reservedIssued ?? 0).toLocaleString("nl-NL"),
      icon: "users" as const,
      tone: "blue" as const,
      helper: rawCounters
        ? `${rawCounters.reserved} gereserveerd · ${rawCounters.issued} uitgegeven`
        : undefined,
    },
    {
      label: "Ingewisseld / ongeldig",
      value: (counters?.redeemedInvalid ?? 0).toLocaleString("nl-NL"),
      icon: "alert" as const,
      tone: "amber" as const,
      helper: rawCounters
        ? `${rawCounters.redeemed} ingewisseld · ${rawCounters.invalid} ongeldig · ${rawCounters.expired} verlopen`
        : undefined,
    },
  ];

  const preview = selectedOffer?.preview;
  const costLine = costPreviewLine(selectedOffer?.cost_preview);
  const shopName = preview?.webshop.name ?? current?.name ?? "Webshop";
  const shopLogo = preview?.webshop.logo_url;

  return (
    <DashboardShell>
      <DashboardHeading
        title="Aanbiedingen &"
        accent="kortingscodes"
        subtitle="Beheer je webshop-promoties en kortingscodes."
        action={
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(11,116,255,0.7)] hover:bg-brand-dark"
          >
            <DashboardIcon name="plus" /> Nieuwe aanbieding
          </button>
        }
      />

      {error && (
        <Panel className="mb-4 border-red-100 bg-red-50/60 p-4 text-sm font-semibold text-red-700">{error}</Panel>
      )}

      {(focusParam === "issued" || focusParam === "claims") && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm">
          <p className="font-semibold text-navy">
            {focusParam === "issued"
              ? "Uitgegeven vouchers staan in het voucheroverzicht."
              : "Geclaimde vouchers staan bij Vouchers. De codevoorraad staat hieronder."}
          </p>
          <Link href="/dashboard/vouchers" className="font-extrabold text-brand hover:underline">
            Naar vouchers
          </Link>
        </div>
      )}

      <Panel className="mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-muted">
            <DashboardIcon name="search" size={18} />
            <input
              value={offerQuery}
              onChange={(e) => setOfferQuery(e.target.value)}
              placeholder="Zoek een aanbieding…"
              className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted/75"
            />
          </label>
          <select
            id="offer-status-filter"
            value={offerListFilter}
            onChange={(e) => setOfferListFilter(e.target.value)}
            className="rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-bold text-navy outline-none focus:border-brand"
            aria-label="Filter aanbiedingstatus"
          >
            <option value="all">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="scheduled">Gepland</option>
            <option value="paused">Gepauzeerd</option>
            <option value="draft">Concept</option>
            <option value="sold_out">Uitverkocht</option>
            <option value="expired">Verlopen</option>
            <option value="archived">Gearchiveerd</option>
          </select>
          <span className="text-sm font-semibold text-muted">
            {visibleOffers.length} aanbieding{visibleOffers.length === 1 ? "" : "en"}
          </span>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-blue-50/70 text-xs font-extrabold text-muted">
                <th className="rounded-l-xl px-3 py-2.5">Aanbieding</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-center">Beschikbaar</th>
                <th className="rounded-r-xl px-3 py-2.5 text-right"> </th>
              </tr>
            </thead>
            <tbody>
              {visibleOffers.map((offer) => (
                <tr
                  key={offer.id}
                  className={`border-b border-blue-50 last:border-0 ${offer.id === selectedOfferId ? "bg-blue-50/50" : ""}`}
                >
                  <td className="px-3 py-3">
                    <p className="font-extrabold text-navy">{offer.terms.name}</p>
                    <p className="text-xs text-muted">{offer.terms.summary}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill status={offerStatusLabel(offerLife(offer))} />
                  </td>
                  <td className="px-3 py-3 text-center font-bold text-navy">
                    {offer.inventory ? offer.inventory.available.toLocaleString("nl-NL") : "—"}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedOfferId(offer.id)}
                      className="text-sm font-extrabold text-brand hover:underline"
                    >
                      {offer.id === selectedOfferId ? "Geselecteerd" : "Selecteer"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loadingOffers && visibleOffers.length === 0 && (
            <p className="py-6 text-center text-sm text-muted">Geen aanbiedingen voor deze zoekopdracht.</p>
          )}
        </div>

        {selectedOffer && (
          <div className="mt-4 grid gap-4 border-t border-blue-50 pt-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(90px,.55fr))_auto] lg:items-center">
            <div className="flex items-center gap-3">
              {shopLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shopLogo} alt="" className="h-14 w-14 rounded-2xl object-cover" />
              ) : (
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-brand">
                  <DashboardIcon name="tag" size={26} />
                </span>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wide text-muted">{shopName}</p>
                  <StatusPill status={offerStatusLabel(offerLife(selectedOffer))} />
                </div>
                <h2 className="font-black text-navy">{selectedOffer.terms.name}</h2>
                <p className="text-sm text-muted">
                  {selectedOffer.terms.public_description || selectedOffer.terms.summary || "—"}
                </p>
                <p className="mt-1 text-xs font-bold text-brand">
                  {acquisitionLabel(selectedOffer.acquisition)}
                  <span className="ml-2 font-semibold text-muted">· v{selectedOffer.terms.version}</span>
                </p>
              </div>
            </div>
            {[
              ["Korting", formatDiscount(selectedOffer.terms)],
              ["Minimum", formatOfferMoney(selectedOffer.terms.min_order_minor)],
              ["Maximaal", formatOfferMoney(selectedOffer.terms.max_discount_minor)],
              [
                "Geldig",
                selectedOffer.terms.redemption_validity_days
                  ? `${selectedOffer.terms.redemption_validity_days} dagen`
                  : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="border-l border-blue-50 pl-4">
                <p className="text-xs font-semibold text-muted">{label}</p>
                <p className="mt-1 font-black text-navy">{value}</p>
              </div>
            ))}
            <div className="flex flex-row flex-wrap gap-2 lg:max-w-[220px] lg:flex-col">
              {offerAllows(selectedOffer, "edit") && (
                <button
                  onClick={openEdit}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"
                >
                  <DashboardIcon name="edit" size={17} /> Bewerken
                </button>
              )}
              {offerAllows(selectedOffer, "publish") && (
                <button
                  onClick={() => void runOfferAction("publish")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Publiceren
                </button>
              )}
              {offerAllows(selectedOffer, "activate") && !offerAllows(selectedOffer, "publish") && (
                <button
                  onClick={() => void runOfferAction("activate")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  <DashboardIcon name="play" size={17} /> Activeren
                </button>
              )}
              {offerAllows(selectedOffer, "pause") && (
                <button
                  onClick={() => void runOfferAction("pause")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-muted hover:bg-slate-50 disabled:opacity-50"
                >
                  <DashboardIcon name="pause" size={17} /> Pauzeren
                </button>
              )}
              {offerAllows(selectedOffer, "resume") && (
                <button
                  onClick={() => void runOfferAction("resume")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy hover:bg-blue-50 disabled:opacity-50"
                >
                  <DashboardIcon name="play" size={17} /> Hervatten
                </button>
              )}
              {offerAllows(selectedOffer, "duplicate") && (
                <button
                  onClick={() => void runOfferAction("duplicate")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-navy hover:bg-blue-50 disabled:opacity-50"
                >
                  <DashboardIcon name="copy" size={17} /> Dupliceren
                </button>
              )}
              {offerAllows(selectedOffer, "archive") && (
                <button
                  onClick={() => void runOfferAction("archive")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-muted hover:bg-slate-50 disabled:opacity-50"
                >
                  Archiveren
                </button>
              )}
              {offerAllows(selectedOffer, "end") && (
                <button
                  onClick={() => void runOfferAction("end")}
                  disabled={actionBusy !== null}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-2.5 text-sm font-extrabold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Beëindigen
                </button>
              )}
            </div>
            <div className="space-y-1 text-sm text-muted lg:col-span-5">
              <p>
                <span className="font-extrabold text-navy">Voorwaarden:</span>{" "}
                {selectedOffer.terms.summary}
                {selectedOffer.terms.combinable === false ? " · Niet combineerbaar" : ""}
                {selectedOffer.terms.categories?.length
                  ? ` · Categorieën: ${selectedOffer.terms.categories.join(", ")}`
                  : ""}
              </p>
              <p className="text-xs font-semibold">{acquisitionHint(selectedOffer.acquisition)}</p>
              {costLine && (
                <p className="rounded-xl bg-blue-50/80 px-3 py-2 text-xs font-bold text-navy">
                  Kostenpreview (geen charge): {costLine}
                  {selectedOffer.cost_preview?.note ? ` — ${selectedOffer.cost_preview.note}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {!loadingOffers && offers.length === 0 && (
          <p className="mt-4 text-sm text-muted">Nog geen aanbiedingen. Maak er een aan om codes te beheren.</p>
        )}
      </Panel>

      <div id="code-inventory" className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(140px,.75fr)_minmax(130px,.65fr)_minmax(160px,.8fr)_auto_auto_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-muted shadow-sm">
          <DashboardIcon name="search" size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek een code…"
            className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted/75"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
        >
          <option value="all">Alle statussen</option>
          <option value="available">Beschikbaar</option>
          <option value="reserved">Gereserveerd</option>
          <option value="issued">Uitgegeven</option>
          <option value="redeemed">Ingewisseld</option>
          <option value="expired">Verlopen</option>
          <option value="invalid">Ongeldig</option>
          <option value="cancelled">Geannuleerd</option>
        </select>
        <select
          value={batchFilter}
          onChange={(e) => {
            setBatchFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
        >
          <option value="all">Alle batches</option>
          {batches.map((batch) => (
            <option key={batch} value={batch}>
              {batch.slice(-8).toUpperCase()}
            </option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => {
            setPlatformFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand"
        >
          <option value="all">Platformstatus</option>
          <option value="verified">Geverifieerd</option>
          <option value="merchant_verification_required">Merchantverificatie</option>
          <option value="unsupported_integration">Niet ondersteund</option>
          <option value="sync_error">Syncfout</option>
          <option value="mismatch">Afwijking</option>
        </select>
        <button
          onClick={() => {
            setPasteValue("");
            setImportPreview(null);
            setModal("paste");
          }}
          disabled={!selectedOffer || !offerAllows(selectedOffer, "import_codes")}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50 disabled:opacity-40"
        >
          <DashboardIcon name="list" size={17} /> Codes plakken
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={!selectedOffer || !offerAllows(selectedOffer, "import_codes") || importBusy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50 disabled:opacity-40"
        >
          <DashboardIcon name="upload" size={17} /> Excel/CSV uploaden
        </button>
        <button
          type="button"
          onClick={() => void downloadTemplate()}
          disabled={!selectedOfferId}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50 disabled:opacity-40"
        >
          <DashboardIcon name="download" size={17} /> Sjabloon
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.txt,.xlsx"
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files?.[0])}
        />
        <button
          onClick={() => void exportCodes()}
          disabled={!selectedOfferId}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50 disabled:opacity-40"
        >
          <DashboardIcon name="download" size={17} /> Exporteren
        </button>
      </div>

      <div className="mb-2 flex flex-wrap gap-2">
        <select
          value={assignedFilter}
          onChange={(e) => {
            setAssignedFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-navy outline-none focus:border-brand"
        >
          <option value="all">Toegewezen + vrij</option>
          <option value="assigned">Alleen toegewezen</option>
          <option value="unassigned">Alleen vrij</option>
        </select>
        <p className="self-center text-xs text-muted">
          Uploaden bewijst niet dat de kassa de code accepteert — zie platformstatus per rij.
        </p>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <DashboardStatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
            helper={stat.helper}
            loading={loadingCodes && !counters}
          />
        ))}
      </div>

      <Panel className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 p-4 sm:p-5">
          <div>
            <h2 className="font-black text-navy">Vouchercodes</h2>
            <p className="text-sm text-muted">Beheer individuele codes en hun beschikbaarheid.</p>
          </div>
          {selectedCodes.length > 0 && (
            <button
              onClick={() => void invalidateSelected()}
              className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 hover:bg-red-100"
            >
              Maak {selectedCodes.length} ongeldig
            </button>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="bg-blue-50/70 text-left text-xs font-extrabold text-muted">
                <th className="w-12 px-5 py-3">
                  <input
                    type="checkbox"
                    checked={codes.length > 0 && codes.every((item) => selectedCodes.includes(item.id))}
                    onChange={() => {
                      const ids = codes.map((c) => c.id);
                      setSelectedCodes((prev) =>
                        ids.every((id) => prev.includes(id))
                          ? prev.filter((id) => !ids.includes(id))
                          : Array.from(new Set([...prev, ...ids]))
                      );
                    }}
                    aria-label="Selecteer zichtbare codes"
                    className="h-4 w-4 accent-[#0b74ff]"
                  />
                </th>
                <th className="px-3 py-3">Kortingscode</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Toegewezen</th>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">Platform</th>
                <th className="px-3 py-3">Toegevoegd</th>
                <th className="px-4 py-3 text-right">Acties</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => (
                <tr key={code.id} className="border-b border-blue-50/80 last:border-0 hover:bg-blue-50/25">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCodes.includes(code.id)}
                      onChange={() =>
                        setSelectedCodes((prev) =>
                          prev.includes(code.id) ? prev.filter((v) => v !== code.id) : [...prev, code.id]
                        )
                      }
                      aria-label={`Selecteer ${code.code}`}
                      className="h-4 w-4 accent-[#0b74ff]"
                    />
                  </td>
                  <td className="px-3 py-3 font-extrabold tracking-wide text-navy">{code.code}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={codeStatusLabel(code.status)} />
                  </td>
                  <td className="px-3 py-3 text-muted">{assignedLabel(code.assigned)}</td>
                  <td className="px-3 py-3 text-muted">
                    {code.batch_id ? code.batch_id.slice(-8).toUpperCase() : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs font-semibold text-muted">
                    {platformValidationLabel(code.platform_validation)}
                  </td>
                  <td className="px-3 py-3 text-muted">{formatAddedAt(code.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => void copyCode(code)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-brand"
                        aria-label={`Kopieer ${code.code}`}
                      >
                        <DashboardIcon name="copy" size={16} />
                      </button>
                      <button
                        onClick={() => void verifyRow(code)}
                        className="rounded-lg px-2 text-xs font-extrabold text-muted hover:bg-blue-50 hover:text-brand"
                        title="Verifieer op webshop"
                      >
                        Check
                      </button>
                      <button
                        onClick={() => void openHistory(code)}
                        className="rounded-lg px-2 text-lg font-black text-muted hover:bg-blue-50 hover:text-brand"
                        aria-label="Geschiedenis"
                      >
                        ···
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-2 p-3 md:hidden">
          {codes.map((code) => (
            <article key={code.id} className="rounded-xl border border-blue-50 bg-slate-50/50 p-3.5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedCodes.includes(code.id)}
                  onChange={() =>
                    setSelectedCodes((prev) =>
                      prev.includes(code.id) ? prev.filter((v) => v !== code.id) : [...prev, code.id]
                    )
                  }
                  aria-label={`Selecteer ${code.code}`}
                  className="mt-1 h-4 w-4 accent-[#0b74ff]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-extrabold tracking-wide text-navy">{code.code}</p>
                    <StatusPill status={codeStatusLabel(code.status)} />
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {code.batch_id ? code.batch_id.slice(-8).toUpperCase() : "—"} · {formatAddedAt(code.created_at)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    {platformValidationLabel(code.platform_validation)}
                  </p>
                  {code.assigned && (
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Toegewezen aan {assignedLabel(code.assigned)}
                    </p>
                  )}
                  <div className="mt-2 flex gap-3">
                    <button
                      onClick={() => void copyCode(code)}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand"
                    >
                      <DashboardIcon name="copy" size={14} /> Kopieer
                    </button>
                    <button onClick={() => void openHistory(code)} className="text-xs font-extrabold text-muted">
                      Geschiedenis
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {!loadingCodes && codes.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-3xl">🔎</p>
            <p className="mt-2 font-extrabold text-navy">Geen codes gevonden</p>
            <p className="text-sm text-muted">Pas je zoekopdracht of filters aan, of importeer codes.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-blue-50 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2 text-muted">
            <span className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 font-bold text-navy">{PAGE_SIZE}</span>
            <span>per pagina</span>
            <span className="mx-1 hidden h-4 w-px bg-blue-100 sm:block" />
            <span>
              {meta.total === 0 ? 0 : meta.from}–{meta.to} van {meta.total} codes
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              disabled={meta.current_page <= 1}
              onClick={() => setPage((n) => Math.max(1, n - 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-muted hover:bg-blue-50 disabled:opacity-40"
            >
              <DashboardIcon name="chevron" size={16} className="rotate-180" />
            </button>
            <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-blue-50 px-3 font-extrabold text-brand">
              {meta.current_page}
            </span>
            <button
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((n) => Math.min(meta.last_page, n + 1))}
              className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-muted hover:bg-blue-50 disabled:opacity-40"
            >
              <DashboardIcon name="chevron" size={16} />
            </button>
          </div>
        </div>
      </Panel>

      {modal && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-navy/45 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="my-8 w-full max-w-lg rounded-[1.6rem] bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">
                  {modal === "paste" || modal === "history" ? "Codevoorraad" : "Aanbieding"}
                </p>
                <h2 className="mt-1 text-2xl font-black text-navy">
                  {modal === "new"
                    ? "Nieuwe aanbieding"
                    : modal === "edit"
                      ? "Aanbieding bewerken"
                      : modal === "history"
                        ? "Codegeschiedenis"
                        : "Codes toevoegen"}
                </h2>
              </div>
              <button
                onClick={() => setModal(null)}
                className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-muted hover:bg-slate-200"
              >
                <DashboardIcon name="close" size={18} />
              </button>
            </div>

            {modal === "history" && historyCode && (
              <div className="mt-5 space-y-3">
                <p className="font-mono text-sm font-bold text-navy">{historyCode.code}</p>
                <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                  {history.map((event, i) => (
                    <li key={`${event.type}-${i}`} className="rounded-xl border border-blue-50 px-3 py-2">
                      <p className="font-extrabold text-navy">{event.type}</p>
                      <p className="text-xs text-muted">
                        {event.from_status ?? "—"} → {event.to_status ?? "—"} · {formatAddedAt(event.recorded_at)}
                      </p>
                    </li>
                  ))}
                  {history.length === 0 && <li className="text-muted">Nog geen gebeurtenissen.</li>}
                </ul>
              </div>
            )}

            {modal === "paste" && (
              <div className="mt-5">
                <p className="text-sm text-muted">
                  Plak één code per regel. Preview toont duplicaten en ongeldige regels vóór commit. Import bewijst niet
                  dat de webshopkassa de code accepteert.
                </p>
                {!importPreview ? (
                  <>
                    <textarea
                      value={pasteValue}
                      onChange={(e) => setPasteValue(e.target.value)}
                      rows={8}
                      placeholder={"WOON10-AB12\nWOON10-CD34\nWOON10-EF56"}
                      className="mt-3 w-full rounded-xl border border-blue-100 px-4 py-3 font-mono text-sm text-navy outline-none focus:border-brand"
                    />
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setModal(null)}
                        className="flex-1 rounded-xl bg-slate-100 py-3 font-extrabold text-navy"
                      >
                        Annuleren
                      </button>
                      <button
                        onClick={() => void runPastePreview()}
                        disabled={importBusy}
                        className="flex-1 rounded-xl bg-brand py-3 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        Preview
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mt-3 rounded-xl bg-blue-50/80 p-4 text-sm">
                      <p className="font-extrabold text-navy">
                        {importPreview.totals.valid} geldig · {importPreview.totals.invalid} ongeldig ·{" "}
                        {importPreview.totals.duplicate_in_upload} duplicaat in upload ·{" "}
                        {importPreview.totals.duplicate_existing} al aanwezig
                      </p>
                      {importPreview.rejections?.length > 0 && (
                        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-muted">
                          {importPreview.rejections.slice(0, 20).map((r) => (
                            <li key={`${r.line}-${r.reason}`}>
                              Regel {r.line}: {r.reason} ({r.code})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="mt-4 flex gap-3">
                      <button
                        onClick={() => setImportPreview(null)}
                        className="flex-1 rounded-xl bg-slate-100 py-3 font-extrabold text-navy"
                      >
                        Terug
                      </button>
                      <button
                        onClick={() => void commitPreview()}
                        disabled={importBusy || importPreview.totals.valid < 1}
                        className="flex-1 rounded-xl bg-brand py-3 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                      >
                        Importeer {importPreview.totals.valid}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {(modal === "new" || modal === "edit") && (
              <form onSubmit={(e) => void saveOffer(e)} className="mt-5 space-y-4">
                {savedPreview && (
                  <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand">Consumentenpreview</p>
                    <p className="mt-1 text-lg font-black text-navy">{savedPreview.title || savedPreview.webshop.name}</p>
                    {savedPreview.summary && <p className="mt-1 text-sm text-muted">{savedPreview.summary}</p>}
                    <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                      <div>
                        <p className="text-sm font-black text-brand">{savedPreview.badge_label}</p>
                        <p className="text-xs font-bold text-navy">{savedPreview.offer_line}</p>
                      </div>
                      <p className="text-right text-xs font-extrabold text-muted">{savedPreview.webshop.name}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted">Opgeslagen. Dit is de preview uit de API.</p>
                  </div>
                )}
                {modal === "new" && (
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Hoe verkrijgt de klant dit?</label>
                    <select
                      value={form.acquisition}
                      onChange={(e) => setForm((f) => ({ ...f, acquisition: e.target.value }))}
                      className="w-full rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-semibold text-navy outline-none focus:border-brand"
                    >
                      <option value="merchant_reward">A. Beloning na aankoop (later inwisselen)</option>
                      <option value="wallet_purchase">B. Aankoop met wallet-tegoed (+ Mollie)</option>
                      <option value="promotional_code">C. Bestaande promotiecode via ShopBonus</option>
                    </select>
                    <p className="mt-1 text-xs text-muted">{acquisitionHint(form.acquisition)}</p>
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy">Naam van aanbieding</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Bijv. 10% korting"
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Type korting</label>
                    <select
                      value={form.type}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, type: e.target.value as "percentage" | "fixed" }))
                      }
                      className="w-full rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-semibold text-navy outline-none focus:border-brand"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Vast bedrag</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Korting</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                      placeholder={form.type === "percentage" ? "10" : "5"}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Minimale bestelwaarde (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.minimum}
                      onChange={(e) => setForm((f) => ({ ...f, minimum: e.target.value }))}
                      placeholder="100"
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Max. korting (€)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.maximum}
                      onChange={(e) => setForm((f) => ({ ...f, maximum: e.target.value }))}
                      placeholder="10"
                      disabled={form.type !== "percentage"}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand disabled:bg-slate-50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Claimgeldigheid (dagen)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.claimDays}
                      onChange={(e) => setForm((f) => ({ ...f, claimDays: e.target.value }))}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-bold text-navy">Inwisselgeldigheid (dagen)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.redemptionDays}
                      onChange={(e) => setForm((f) => ({ ...f, redemptionDays: e.target.value }))}
                      className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-bold text-navy">Publieke beschrijving</label>
                  <textarea
                    value={form.condition}
                    onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
                    rows={2}
                    placeholder="Niet combineerbaar met andere acties."
                    className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <input
                    type="checkbox"
                    checked={form.combinable}
                    onChange={(e) => setForm((f) => ({ ...f, combinable: e.target.checked }))}
                    className="h-4 w-4 accent-[#0b74ff]"
                  />
                  Combineerbaar met andere acties
                </label>
                {modal === "edit" && selectedOffer?.terms.locked && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                    Actieve voorwaarden zijn vastgelegd. Opslaan maakt versie {(selectedOffer.terms.version ?? 1) + 1};
                    al uitgegeven vouchers blijven op de oude voorwaarden.
                  </p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="flex-1 rounded-xl bg-slate-100 py-3.5 font-extrabold text-navy"
                  >
                    Annuleren
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark disabled:opacity-50"
                  >
                    {modal === "edit" ? "Wijzigingen opslaan" : "Aanbieding aanmaken"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </DashboardShell>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<p className="p-8">Aanbiedingen laden…</p>}>
      <MerchantOffersPage />
    </Suspense>
  );
}
