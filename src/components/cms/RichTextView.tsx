"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  sanitizeHref,
  type RichDoc,
  type RichMark,
  type RichTextNode,
} from "@/lib/richText";

function renderMarks(text: string, marks: RichMark[] | undefined, key: string): ReactNode {
  let node: ReactNode = text;
  for (const mark of marks ?? []) {
    if (mark.type === "bold") node = <strong key={`${key}-b`}>{node}</strong>;
    else if (mark.type === "italic") node = <em key={`${key}-i`}>{node}</em>;
    else if (mark.type === "link") {
      const href = sanitizeHref(mark.attrs.href);
      if (!href) continue;
      if (href.startsWith("/")) {
        node = (
          <Link key={`${key}-l`} href={href} className="font-bold text-brand underline-offset-2 hover:underline">
            {node}
          </Link>
        );
      } else {
        node = (
          <a
            key={`${key}-l`}
            href={href}
            rel="noopener noreferrer"
            target="_blank"
            className="font-bold text-brand underline-offset-2 hover:underline"
          >
            {node}
          </a>
        );
      }
    }
  }
  return node;
}

function NodeView({ node, path }: { node: RichTextNode; path: string }) {
  const children = (node.content ?? []).map((child, i) => (
    <NodeView key={`${path}.${i}`} node={child} path={`${path}.${i}`} />
  ));

  switch (node.type) {
    case "text":
      return <>{renderMarks(node.text ?? "", node.marks, path)}</>;
    case "paragraph":
      return <p className="mb-4 leading-relaxed text-muted last:mb-0">{children}</p>;
    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      const cls = "mb-3 font-extrabold tracking-tight text-navy";
      if (level === 3) return <h3 className={`text-xl ${cls}`}>{children}</h3>;
      if (level === 4) return <h4 className={`text-lg ${cls}`}>{children}</h4>;
      return <h2 className={`text-2xl ${cls}`}>{children}</h2>;
    }
    case "bulletList":
      return <ul className="mb-4 list-disc space-y-1 pl-6 text-muted">{children}</ul>;
    case "orderedList":
      return <ol className="mb-4 list-decimal space-y-1 pl-6 text-muted">{children}</ol>;
    case "listItem":
      return <li>{children}</li>;
    case "image": {
      const src = typeof node.attrs?.src === "string" ? node.attrs.src : null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      if (!src) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="my-6 w-full rounded-2xl object-cover" loading="lazy" />
      );
    }
    case "button": {
      const href = sanitizeHref(node.attrs?.href);
      const label = typeof node.attrs?.label === "string" ? node.attrs.label : "Link";
      if (!href) return null;
      const className =
        "mb-4 inline-flex rounded-2xl bg-brand px-5 py-2.5 text-sm font-extrabold text-white hover:bg-brand-dark";
      if (href.startsWith("/")) {
        return (
          <p>
            <Link href={href} className={className}>
              {label}
            </Link>
          </p>
        );
      }
      return (
        <p>
          <a href={href} className={className} rel="noopener noreferrer" target="_blank">
            {label}
          </a>
        </p>
      );
    }
    default:
      return null;
  }
}

/** Safely render CMS rich-text JSON (never HTML). Unknown nodes are skipped. */
export default function RichTextView({ doc }: { doc: RichDoc | null | undefined }) {
  if (!doc || doc.type !== "doc" || !Array.isArray(doc.content)) return null;
  return (
    <div className="cms-richtext max-w-none">
      {doc.content.map((node, i) => (
        <NodeView key={`root.${i}`} node={node} path={`root.${i}`} />
      ))}
    </div>
  );
}
