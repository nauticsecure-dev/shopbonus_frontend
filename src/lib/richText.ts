/**
 * ProseMirror/Tiptap-style document matching Laravel Cms\RichText allowlist.
 * Stored as JSON only — never raw HTML — so scripts cannot persist.
 */

export type RichMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "link"; attrs: { href: string } };

export type RichTextNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: RichMark[];
  text?: string;
  content?: RichTextNode[];
};

export type RichDoc = {
  type: "doc";
  content: RichTextNode[];
};

export type CmsPageContent = {
  title: string;
  seo_title?: string;
  seo_description?: string;
  body: RichDoc;
};

export function emptyDoc(paragraph = "…"): RichDoc {
  const text = paragraph.trim() || "…";
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text }],
      },
    ],
  };
}

export function emptyPageContent(title = "Nieuwe pagina"): CmsPageContent {
  const safeTitle = title.trim() || "Nieuwe pagina";
  return {
    title: safeTitle,
    seo_title: safeTitle,
    seo_description: "ShopBonus",
    body: emptyDoc("Nieuwe inhoud."),
  };
}

/** Convert plain multiline text into a simple doc (paragraphs). */
export function paragraphsToDoc(text: string): RichDoc {
  const lines = text.replace(/\r\n/g, "\n").split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return emptyDoc();
  return {
    type: "doc",
    content: lines.map((line) => ({
      type: "paragraph" as const,
      content: [{ type: "text" as const, text: line.slice(0, 5000) }],
    })),
  };
}

export function docToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc?.content) return "";
  const parts: string[] = [];
  const walk = (node: RichTextNode) => {
    if (node.type === "text" && node.text) parts.push(node.text);
    if (node.type === "paragraph" || node.type === "heading") parts.push("\n");
    for (const child of node.content ?? []) walk(child);
  };
  for (const n of doc.content) walk(n);
  return parts.join("").replace(/\n+/g, "\n").trim();
}

/** Safe href: https or site-relative only. */
export function sanitizeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const t = href.trim();
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  if (/^https:\/\//i.test(t)) return t;
  return null;
}
