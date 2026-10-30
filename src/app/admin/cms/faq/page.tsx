"use client";

import { useEffect, useState } from "react";
import AdminListPage from "@/components/AdminListPage";
import RichTextEditor from "@/components/cms/RichTextEditor";
import { ApiError } from "@/lib/api";
import {
  createFaqCategory,
  createFaqItem,
  listAdminFaq,
  reorderFaq,
  updateFaqItem,
  type FaqAudience,
  type FaqCategoryAdmin,
} from "@/lib/cms";
import { emptyDoc } from "@/lib/richText";
import { useLocale } from "@/i18n/LocaleContext";

export default function AdminFaqPage() {
  const { locale, dictionary: t } = useLocale();
  const [categories, setCategories] = useState<FaqCategoryAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [catKey, setCatKey] = useState("");
  const [catNl, setCatNl] = useState("");
  const [catEn, setCatEn] = useState("");
  const [itemCat, setItemCat] = useState("");
  const [qNl, setQNl] = useState("");
  const [qEn, setQEn] = useState("");
  const [aNl, setANl] = useState(emptyDoc());
  const [aEn, setAEn] = useState(emptyDoc());
  const [audience, setAudience] = useState<FaqAudience>("public");

  const load = async () => {
    setError(null);
    try {
      setCategories(await listAdminFaq(locale));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function addCategory() {
    if (!catKey.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createFaqCategory({
        key: catKey.trim().toLowerCase(),
        names: { nl: catNl || catKey, en: catEn || catKey },
        locale,
      });
      setCatKey("");
      setCatNl("");
      setCatEn("");
      setMessage(locale === "en" ? "Category created" : "Categorie aangemaakt");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function addItem() {
    if (!itemCat || !qNl.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await createFaqItem({
        category_id: itemCat,
        audience,
        published: true,
        translations: {
          nl: { question: qNl, answer: aNl },
          en: { question: qEn || qNl, answer: aEn },
        },
        locale,
      });
      setQNl("");
      setQEn("");
      setANl(emptyDoc());
      setAEn(emptyDoc());
      setMessage(locale === "en" ? "FAQ item created" : "FAQ-item aangemaakt");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function move(catId: string, itemId: string, dir: -1 | 1) {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    const ids = cat.items.map((i) => i.id);
    const idx = ids.indexOf(itemId);
    const next = idx + dir;
    if (idx < 0 || next < 0 || next >= ids.length) return;
    const swapped = [...ids];
    [swapped[idx], swapped[next]] = [swapped[next], swapped[idx]];
    setBusy(true);
    try {
      setCategories(await reorderFaq(catId, swapped, locale));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(itemId: string, revision: number, published: boolean) {
    setBusy(true);
    try {
      await updateFaqItem(itemId, { revision, published: !published }, locale);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminListPage
      title={t.adminFaq}
      accent="cms"
      backHref="/admin/cms"
      subtitle={
        locale === "en"
          ? "Categories, NL/EN answers, drag-order via arrows, audience visibility."
          : "Categorieën, NL/EN antwoorden, volgorde via pijlen, doelgroepzichtbaarheid."
      }
    >
      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      {message && <p className="mb-3 text-sm text-green-700">{message}</p>}

      <div className="mb-6 grid gap-3 rounded-2xl border border-blue-100 bg-mist/40 p-4 md:grid-cols-4">
        <input
          value={catKey}
          onChange={(e) => setCatKey(e.target.value)}
          placeholder="category-key"
          className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <input
          value={catNl}
          onChange={(e) => setCatNl(e.target.value)}
          placeholder="Naam NL"
          className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <input
          value={catEn}
          onChange={(e) => setCatEn(e.target.value)}
          placeholder="Name EN"
          className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void addCategory()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {locale === "en" ? "Add category" : "Categorie toevoegen"}
        </button>
      </div>

      <div className="mb-8 space-y-3 rounded-2xl border border-blue-100 p-4">
        <h3 className="font-extrabold text-navy">
          {locale === "en" ? "New FAQ item" : "Nieuw FAQ-item"}
        </h3>
        <select
          value={itemCat}
          onChange={(e) => setItemCat(e.target.value)}
          className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm"
        >
          <option value="">{locale === "en" ? "Select category" : "Kies categorie"}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.names[locale] ?? c.key}
            </option>
          ))}
        </select>
        <select
          value={audience}
          onChange={(e) => setAudience(e.target.value as FaqAudience)}
          className="rounded-xl border border-blue-100 px-3 py-2 text-sm"
        >
          <option value="public">public</option>
          <option value="consumers">consumers</option>
          <option value="merchants">merchants</option>
        </select>
        <input
          value={qNl}
          onChange={(e) => setQNl(e.target.value)}
          placeholder="Vraag NL"
          className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <input
          value={qEn}
          onChange={(e) => setQEn(e.target.value)}
          placeholder="Question EN"
          className="w-full rounded-xl border border-blue-100 px-3 py-2 text-sm"
        />
        <RichTextEditor label="Antwoord NL" value={aNl} onChange={setANl} rows={4} />
        <RichTextEditor label="Answer EN" value={aEn} onChange={setAEn} rows={4} />
        <button
          type="button"
          disabled={busy}
          onClick={() => void addItem()}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-extrabold text-white disabled:opacity-60"
        >
          {locale === "en" ? "Add item" : "Item toevoegen"}
        </button>
      </div>

      <div className="space-y-6">
        {categories.map((cat) => (
          <section key={cat.id} className="rounded-2xl border border-blue-100 bg-white">
            <header className="flex items-center justify-between border-b border-blue-50 px-4 py-3">
              <h3 className="font-extrabold text-navy">
                {cat.names[locale] ?? cat.key}{" "}
                <span className="text-xs font-bold text-muted">({cat.key})</span>
              </h3>
              <span className="text-xs text-muted">{cat.items.length} items</span>
            </header>
            <ul className="divide-y divide-blue-50">
              {cat.items.map((item, idx) => (
                <li key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled={busy || idx === 0}
                      onClick={() => void move(cat.id, item.id, -1)}
                      className="rounded bg-mist px-2 text-xs font-bold disabled:opacity-40"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={busy || idx === cat.items.length - 1}
                      onClick={() => void move(cat.id, item.id, 1)}
                      className="rounded bg-mist px-2 text-xs font-bold disabled:opacity-40"
                    >
                      ↓
                    </button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy">
                      {item.translations.nl?.question ?? item.translations.en?.question}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {item.audience} · rev {item.revision} ·{" "}
                      {item.published ? "published" : "hidden"}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void togglePublished(item.id, item.revision, item.published)}
                    className="text-xs font-extrabold text-brand"
                  >
                    {item.published
                      ? locale === "en"
                        ? "Unpublish"
                        : "Depubliceren"
                      : locale === "en"
                        ? "Publish"
                        : "Publiceren"}
                  </button>
                </li>
              ))}
              {cat.items.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-muted">{t.empty}</li>
              )}
            </ul>
          </section>
        ))}
      </div>
    </AdminListPage>
  );
}
