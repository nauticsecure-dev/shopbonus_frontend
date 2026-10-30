"use client";

import { useMemo } from "react";
import {
  docToPlainText,
  paragraphsToDoc,
  type RichDoc,
} from "@/lib/richText";

/**
 * Schema-aligned draft editor: plain paragraphs → ProseMirror doc.
 * Super Admin Content Studio uses this for legal/FAQ bodies without
 * loading a heavy editor for every visitor. Output matches Cms\RichText.
 */
export default function RichTextEditor({
  value,
  onChange,
  label,
  rows = 12,
  disabled,
}: {
  value: RichDoc;
  onChange: (doc: RichDoc) => void;
  label?: string;
  rows?: number;
  disabled?: boolean;
}) {
  const plain = useMemo(() => docToPlainText(value), [value]);

  return (
    <label className="block space-y-1.5">
      {label && <span className="text-sm font-extrabold text-navy">{label}</span>}
      <textarea
        value={plain}
        disabled={disabled}
        rows={rows}
        onChange={(e) => onChange(paragraphsToDoc(e.target.value))}
        className="w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm leading-relaxed text-navy outline-none ring-brand/30 placeholder:text-muted/70 focus:ring-2 disabled:opacity-60"
        placeholder="Schrijf alinea's. Elke lege regel wordt een nieuwe alinea."
      />
      <span className="block text-xs text-muted">
        Opslag als toegestaan JSON-schema (geen HTML). Links en afbeeldingen via Content Studio
        slots waar beschikbaar.
      </span>
    </label>
  );
}
