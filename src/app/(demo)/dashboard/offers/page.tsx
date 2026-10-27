"use client";

import { Suspense, useMemo, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import DashboardShell from "@/features/dashboard/components/DashboardShell";
import DashboardIcon from "@/features/dashboard/components/DashboardIcon";
import { DashboardHeading, DashboardStatCard, Panel, PanelHeading, StatusPill } from "@/features/dashboard/components/DashboardPrimitives";
import { merchantOffers as initialOffers, voucherCodes as initialCodes, type MerchantOffer, type VoucherCode } from "@/fixtures/dashboard";
import { useShopBonus } from "@/features/shopper/ShopBonusContext";

const money = (value: number) => `€ ${value.toLocaleString("nl-NL")}`;

function MerchantOffersPage() {
  const params = useSearchParams();
  const { pushToast } = useShopBonus();
  const [offers, setOffers] = useState<MerchantOffer[]>(initialOffers);
  const [codes, setCodes] = useState<VoucherCode[]>(initialCodes);
  const [selectedOfferId, setSelectedOfferId] = useState(initialOffers[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("Alle statussen");
  const [batchFilter, setBatchFilter] = useState("Alle batches");
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<"new" | "edit" | "paste" | null>(params.has("new") ? "new" : null);
  const [pasteValue, setPasteValue] = useState("");
  const [addedCount, setAddedCount] = useState(0);
  const [form, setForm] = useState({ title: "", type: "Percentage" as "Percentage" | "Vast bedrag", value: "", minimum: "", condition: "" });
  const fileRef = useRef<HTMLInputElement>(null);
  const pageSize = 7;


  const selectedOffer = offers.find((offer) => offer.id === selectedOfferId) ?? offers[0];
  const filteredCodes = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return codes.filter((code) => {
      const matchesQuery = !needle || [code.code, code.assigned, code.batch].some((v) => v.toLowerCase().includes(needle));
      const matchesStatus = statusFilter === "Alle statussen" || code.status === statusFilter;
      const matchesBatch = batchFilter === "Alle batches" || code.batch === batchFilter;
      return matchesQuery && matchesStatus && matchesBatch;
    });
  }, [codes, query, statusFilter, batchFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredCodes.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleCodes = filteredCodes.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const counts = {
    total: 500 + addedCount,
    available: 412 + addedCount,
    issued: 75,
    invalid: 13,
  };
  const stats = [
    { label: "Totaal codes", value: counts.total.toLocaleString("nl-NL"), icon: "ticket" as const, tone: "blue" as const },
    { label: "Beschikbaar", value: counts.available.toLocaleString("nl-NL"), icon: "check" as const, tone: "green" as const },
    { label: "Uitgegeven", value: counts.issued.toLocaleString("nl-NL"), icon: "users" as const, tone: "blue" as const },
    { label: "Ongeldig", value: counts.invalid.toLocaleString("nl-NL"), icon: "alert" as const, tone: "amber" as const },
  ];

  const openNew = () => {
    setForm({ title: "", type: "Percentage", value: "", minimum: "", condition: "" });
    setModal("new");
  };

  const openEdit = () => {
    if (!selectedOffer) return;
    setForm({
      title: selectedOffer.title,
      type: selectedOffer.type,
      value: selectedOffer.value.replace(/[^0-9]/g, ""),
      minimum: selectedOffer.minimum.replace(/[^0-9]/g, ""),
      condition: selectedOffer.condition,
    });
    setModal("edit");
  };

  const saveOffer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedValue = Number(form.value);
    const parsedMinimum = Number(form.minimum);
    if (!form.title.trim() || parsedValue <= 0 || parsedMinimum < 0) {
      pushToast({ title: "Controleer de aanbieding", message: "Vul een naam, korting en geldige minimale bestelwaarde in.", kind: "error" });
      return;
    }
    if (modal === "edit" && selectedOffer) {
      setOffers((prev) => prev.map((item) => item.id === selectedOffer.id ? {
        ...item,
        title: form.title.trim(),
        type: form.type,
        value: form.type === "Percentage" ? `${parsedValue}%` : `€ ${parsedValue}`,
        minimum: money(parsedMinimum),
        condition: form.condition.trim() || "Geldig volgens de actievoorwaarden.",
      } : item));
      pushToast({ title: "Aanbieding bijgewerkt", message: "Je wijzigingen zijn opgeslagen.", kind: "success" });
    } else {
      const newOffer: MerchantOffer = {
        id: `offer-${Date.now()}`,
        title: form.title.trim(),
        type: form.type,
        value: form.type === "Percentage" ? `${parsedValue}%` : `€ ${parsedValue}`,
        minimum: money(parsedMinimum),
        maximum: form.type === "Percentage" ? money(parsedValue) : "—",
        validity: "90 dagen",
        stock: 0,
        issued: 0,
        claimed: 0,
        remaining: 0,
        status: "Concept",
        condition: form.condition.trim() || "Geldig volgens de actievoorwaarden.",
      };
      setOffers((prev) => [newOffer, ...prev]);
      setSelectedOfferId(newOffer.id);
      pushToast({ title: "Aanbieding aangemaakt", message: "Je nieuwe aanbieding is als concept opgeslagen.", kind: "success" });
    }
    setModal(null);
  };

  const toggleOffer = () => {
    if (!selectedOffer) return;
    const nextStatus = selectedOffer.status === "Actief" ? "Gepauzeerd" : "Actief";
    setOffers((prev) => prev.map((item) => item.id === selectedOffer.id ? { ...item, status: nextStatus } : item));
    pushToast({ title: nextStatus === "Actief" ? "Aanbieding hervat" : "Aanbieding gepauzeerd", message: `${selectedOffer.title} is nu ${nextStatus.toLowerCase()}.`, kind: "success" });
  };

  const addCodes = (raw: string) => {
    const values = Array.from(new Set(raw.split(/[\n,;\t]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)));
    if (!values.length) {
      pushToast({ title: "Geen codes gevonden", message: "Plak één voucher-code per regel.", kind: "error" });
      return;
    }
    const existing = new Set(codes.map((item) => item.code));
    const unique = values.filter((value) => !existing.has(value));
    if (!unique.length) {
      pushToast({ title: "Codes bestaan al", message: "Alle geplakte codes staan al in deze lijst.", kind: "info" });
      return;
    }
    const now = new Date().toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    const batch = `Batch ${Math.max(1, ...codes.map((item) => Number(item.batch.replace(/\D/g, "")) || 1)) + 1}`;
    const appended = unique.map((value, index) => ({
      id: `added-${Date.now()}-${index}`,
      code: value,
      status: "Beschikbaar" as const,
      assigned: "—",
      batch,
      added: now,
    }));
    setCodes((prev) => [...appended, ...prev]);
    setAddedCount((n) => n + unique.length);
    setPasteValue("");
    setModal(null);
    setPage(1);
    pushToast({ title: `${unique.length} codes toegevoegd`, message: `De codes staan klaar in ${batch}.`, kind: "success" });
  };

  const handleUpload = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    addCodes(text);
    if (fileRef.current) fileRef.current.value = "";
  };

  const exportCodes = () => {
    const rows = [["Code", "Status", "Toegewezen aan", "Batch", "Toegevoegd"], ...filteredCodes.map((c) => [c.code, c.status, c.assigned, c.batch, c.added])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shopbonus-vouchercodes.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    pushToast({ title: "Export gestart", message: `${filteredCodes.length} codes geëxporteerd naar CSV.`, kind: "success" });
  };

  const toggleCode = (id: string) => setSelectedCodes((prev) => prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]);
  const toggleAllVisible = () => {
    const ids = visibleCodes.map((item) => item.id);
    setSelectedCodes((prev) => ids.every((id) => prev.includes(id)) ? prev.filter((id) => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
  };
  const invalidateSelected = () => {
    if (!selectedCodes.length) return;
    setCodes((prev) => prev.map((code) => selectedCodes.includes(code.id) ? { ...code, status: "Ongeldig" } : code));
    setSelectedCodes([]);
    pushToast({ title: "Codes bijgewerkt", message: "De geselecteerde codes zijn ongeldig gemaakt.", kind: "success" });
  };

  return (
    <DashboardShell>
      <DashboardHeading
        title="Aanbiedingen &"
        accent="kortingscodes"
        subtitle="Maak en beheer kortingscodes voor jouw webshop via ShopBonus."
        action={<button onClick={openNew} className="inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3.5 font-extrabold text-white shadow-[0_12px_28px_-12px_rgba(11,116,255,0.7)] hover:bg-brand-dark"><DashboardIcon name="plus" /> Nieuwe aanbieding</button>}
      />

      {/* Offer selector and summary */}
      <Panel className="mb-4 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <label htmlFor="selected-offer" className="text-sm font-extrabold text-navy">Geselecteerde aanbieding:</label>
            <select id="selected-offer" value={selectedOfferId} onChange={(e) => setSelectedOfferId(e.target.value)} className="min-w-0 rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-navy outline-none focus:border-brand sm:min-w-[300px]">
              {offers.map((offer) => <option key={offer.id} value={offer.id}>{offer.title} vanaf {offer.minimum}</option>)}
            </select>
            <span className="text-sm font-semibold text-muted">{offers.length} aanbiedingen</span>
          </div>
          {selectedOffer && <StatusPill status={selectedOffer.status} />}
        </div>

        {selectedOffer && (
          <div className="mt-4 grid gap-4 border-t border-blue-50 pt-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(4,minmax(90px,.55fr))_auto] lg:items-center">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-blue-50 text-brand"><DashboardIcon name="tag" size={26} /></span>
              <div><h2 className="font-black text-navy">{selectedOffer.title}</h2><p className="text-sm text-muted">Code voor alle artikelen vanaf {selectedOffer.minimum}</p></div>
            </div>
            {[
              ["Korting", selectedOffer.value],
              ["Minimum", selectedOffer.minimum],
              ["Maximaal", selectedOffer.maximum],
              ["Geldig", selectedOffer.validity],
            ].map(([label, value]) => <div key={label} className="border-l border-blue-50 pl-4"><p className="text-xs font-semibold text-muted">{label}</p><p className="mt-1 font-black text-navy">{value}</p></div>)}
            <div className="flex flex-row gap-2 lg:flex-col">
              <button onClick={openEdit} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"><DashboardIcon name="edit" size={17} /> Bewerken</button>
              <button onClick={toggleOffer} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-extrabold text-muted hover:bg-slate-50"><DashboardIcon name={selectedOffer.status === "Actief" ? "pause" : "play"} size={17} /> {selectedOffer.status === "Actief" ? "Pauzeren" : "Hervatten"}</button>
            </div>
            <p className="text-sm text-muted lg:col-span-5"><span className="font-extrabold text-navy">Voorwaarden:</span> {selectedOffer.condition}</p>
          </div>
        )}
      </Panel>

      {/* Search and tools */}
      <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(140px,.75fr)_minmax(130px,.65fr)_auto_auto_auto]">
        <label className="flex items-center gap-2 rounded-xl border border-blue-100 bg-white px-3.5 py-2.5 text-muted shadow-sm">
          <DashboardIcon name="search" size={18} />
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Zoek een code…" className="min-w-0 flex-1 bg-transparent text-sm text-navy outline-none placeholder:text-muted/75" />
        </label>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand">
          <option>Alle statussen</option><option>Beschikbaar</option><option>Uitgegeven</option><option>Ongeldig</option>
        </select>
        <select value={batchFilter} onChange={(e) => { setBatchFilter(e.target.value); setPage(1); }} className="rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-sm font-bold text-navy outline-none focus:border-brand">
          <option>Alle batches</option>{Array.from(new Set(codes.map((code) => code.batch))).map((batch) => <option key={batch}>{batch}</option>)}
        </select>
        <button onClick={() => { setPasteValue(""); setModal("paste"); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"><DashboardIcon name="list" size={17} /> Codes plakken</button>
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"><DashboardIcon name="upload" size={17} /> Excel/CSV uploaden</button>
        <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx" className="hidden" onChange={(e) => void handleUpload(e.target.files?.[0])} />
        <button onClick={exportCodes} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-extrabold text-brand hover:bg-blue-50"><DashboardIcon name="download" size={17} /> Exporteren</button>
      </div>

      {/* Code metrics */}
      <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => <DashboardStatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />)}
      </div>

      {/* Codes list */}
      <Panel className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 p-4 sm:p-5">
          <div><h2 className="font-black text-navy">Vouchercodes</h2><p className="text-sm text-muted">Beheer individuele codes en hun beschikbaarheid.</p></div>
          {selectedCodes.length > 0 && <button onClick={invalidateSelected} className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-extrabold text-red-600 hover:bg-red-100">Maak {selectedCodes.length} ongeldig</button>}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[780px] border-collapse text-sm">
            <thead><tr className="bg-blue-50/70 text-left text-xs font-extrabold text-muted">
              <th className="w-12 px-5 py-3"><input type="checkbox" checked={visibleCodes.length > 0 && visibleCodes.every((item) => selectedCodes.includes(item.id))} onChange={toggleAllVisible} aria-label="Selecteer zichtbare codes" className="h-4 w-4 accent-[#0b74ff]" /></th>
              <th className="px-3 py-3">Kortingscode</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Toegewezen</th><th className="px-3 py-3">Batch</th><th className="px-3 py-3">Toegevoegd</th><th className="px-4 py-3 text-right">Acties</th>
            </tr></thead>
            <tbody>
              {visibleCodes.map((code) => <tr key={code.id} className="border-b border-blue-50/80 last:border-0 hover:bg-blue-50/25">
                <td className="px-5 py-3"><input type="checkbox" checked={selectedCodes.includes(code.id)} onChange={() => toggleCode(code.id)} aria-label={`Selecteer ${code.code}`} className="h-4 w-4 accent-[#0b74ff]" /></td>
                <td className="px-3 py-3 font-extrabold tracking-wide text-navy">{code.code}</td>
                <td className="px-3 py-3"><StatusPill status={code.status} /></td>
                <td className="px-3 py-3 text-muted">{code.assigned}</td><td className="px-3 py-3 text-muted">{code.batch}</td><td className="px-3 py-3 text-muted">{code.added}</td>
                <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1"><button onClick={() => { navigator.clipboard?.writeText(code.code); pushToast({ title: "Code gekopieerd", message: `${code.code} staat op je klembord.`, kind: "success" }); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-blue-50 hover:text-brand" aria-label={`Kopieer ${code.code}`}><DashboardIcon name="copy" size={16} /></button><button onClick={() => { setCodes((prev) => prev.map((item) => item.id === code.id ? { ...item, status: item.status === "Ongeldig" ? "Beschikbaar" : "Ongeldig" } : item)); pushToast({ title: "Status aangepast", message: `${code.code} is bijgewerkt.`, kind: "success" }); }} className="rounded-lg px-2 text-lg font-black text-muted hover:bg-blue-50 hover:text-brand" aria-label="Meer opties">···</button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>

        {/* Compact cards on small screens */}
        <div className="space-y-2 p-3 md:hidden">
          {visibleCodes.map((code) => <article key={code.id} className="rounded-xl border border-blue-50 bg-slate-50/50 p-3.5">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedCodes.includes(code.id)} onChange={() => toggleCode(code.id)} aria-label={`Selecteer ${code.code}`} className="mt-1 h-4 w-4 accent-[#0b74ff]" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-extrabold tracking-wide text-navy">{code.code}</p><StatusPill status={code.status} /></div>
                <p className="mt-1 text-xs text-muted">{code.batch} · {code.added}</p>
                {code.assigned !== "—" && <p className="mt-1 text-xs font-semibold text-muted">Toegewezen aan {code.assigned}</p>}
                <button onClick={() => { navigator.clipboard?.writeText(code.code); pushToast({ title: "Code gekopieerd", message: `${code.code} staat op je klembord.`, kind: "success" }); }} className="mt-2 inline-flex items-center gap-1.5 text-xs font-extrabold text-brand"><DashboardIcon name="copy" size={14} /> Kopieer</button>
              </div>
            </div>
          </article>)}
        </div>

        {visibleCodes.length === 0 && <div className="px-5 py-12 text-center"><p className="text-3xl">🔎</p><p className="mt-2 font-extrabold text-navy">Geen codes gevonden</p><p className="text-sm text-muted">Pas je zoekopdracht of filters aan.</p></div>}

        <div className="flex flex-col gap-3 border-t border-blue-50 px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-2 text-muted">
            <select value={pageSize} onChange={() => setPage(1)} className="rounded-lg border border-blue-100 bg-white px-2.5 py-1.5 font-bold text-navy"><option value={7}>7</option></select>
            <span>per pagina</span><span className="mx-1 hidden h-4 w-px bg-blue-100 sm:block" />
            <span>{filteredCodes.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredCodes.length)} van {filteredCodes.length} codes</span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button disabled={currentPage <= 1} onClick={() => setPage((n) => Math.max(1, n - 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-muted disabled:opacity-40 hover:bg-blue-50"><DashboardIcon name="chevron" size={16} className="rotate-180" /></button>
            <span className="grid h-9 min-w-9 place-items-center rounded-xl bg-blue-50 px-3 font-extrabold text-brand">{currentPage}</span>
            <button disabled={currentPage >= pageCount} onClick={() => setPage((n) => Math.min(pageCount, n + 1))} className="grid h-9 w-9 place-items-center rounded-xl border border-blue-100 text-muted disabled:opacity-40 hover:bg-blue-50"><DashboardIcon name="chevron" size={16} /></button>
          </div>
        </div>
      </Panel>

      {/* Modal for add/edit/paste */}
      {modal && <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-navy/45 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
        <div className="my-8 w-full max-w-lg rounded-[1.6rem] bg-white p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-brand">{modal === "paste" ? "Codevoorraad" : "Aanbieding"}</p><h2 className="mt-1 text-2xl font-black text-navy">{modal === "new" ? "Nieuwe aanbieding" : modal === "edit" ? "Aanbieding bewerken" : "Codes toevoegen"}</h2></div><button onClick={() => setModal(null)} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-muted hover:bg-slate-200"><DashboardIcon name="close" size={18} /></button></div>
          {modal === "paste" ? <div className="mt-5"><p className="text-sm text-muted">Plak één code per regel. Dubbele codes worden automatisch overgeslagen.</p><textarea value={pasteValue} onChange={(e) => setPasteValue(e.target.value)} rows={8} placeholder="WOON10-AB12\nWOON10-CD34\nWOON10-EF56" className="mt-3 w-full rounded-xl border border-blue-100 px-4 py-3 font-mono text-sm text-navy outline-none focus:border-brand" /><div className="mt-4 flex gap-3"><button onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3 font-extrabold text-navy">Annuleren</button><button onClick={() => addCodes(pasteValue)} className="flex-1 rounded-xl bg-brand py-3 font-extrabold text-white hover:bg-brand-dark">Codes toevoegen</button></div></div> : <form onSubmit={saveOffer} className="mt-5 space-y-4">
            <div><label className="mb-1 block text-sm font-bold text-navy">Naam van aanbieding</label><input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Bijv. 10% korting" className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand" required /></div>
            <div className="grid grid-cols-2 gap-3"><div><label className="mb-1 block text-sm font-bold text-navy">Type korting</label><select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "Percentage" | "Vast bedrag" }))} className="w-full rounded-xl border border-blue-100 bg-white px-3 py-3 text-sm font-semibold text-navy outline-none focus:border-brand"><option>Percentage</option><option>Vast bedrag</option></select></div><div><label className="mb-1 block text-sm font-bold text-navy">Korting</label><input type="number" min="1" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} placeholder={form.type === "Percentage" ? "10" : "5"} className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand" required /></div></div>
            <div><label className="mb-1 block text-sm font-bold text-navy">Minimale bestelwaarde (€)</label><input type="number" min="0" value={form.minimum} onChange={(e) => setForm((f) => ({ ...f, minimum: e.target.value }))} placeholder="100" className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand" required /></div>
            <div><label className="mb-1 block text-sm font-bold text-navy">Voorwaarden</label><textarea value={form.condition} onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))} rows={2} placeholder="Niet combineerbaar met andere acties." className="w-full rounded-xl border border-blue-100 px-4 py-3 text-navy outline-none focus:border-brand" /></div>
            <div className="flex gap-3 pt-1"><button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl bg-slate-100 py-3.5 font-extrabold text-navy">Annuleren</button><button type="submit" className="flex-1 rounded-xl bg-brand py-3.5 font-extrabold text-white hover:bg-brand-dark">{modal === "edit" ? "Wijzigingen opslaan" : "Aanbieding aanmaken"}</button></div>
          </form>}
        </div>
      </div>}
    </DashboardShell>
  );
}

export default function OffersPage() { return <Suspense fallback={<p className="p-8">Aanbiedingen laden…</p>}><MerchantOffersPage /></Suspense>; }
