"use client";

import { useState } from "react";
import { initialsFromName } from "@/lib/discovery";

/** Keep shop cards readable when a remote merchant image is unavailable. */
export default function ShopImage({ src, name, className }: { src: string | null | undefined; name: string; className: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <span aria-hidden className={`${className} grid place-items-center bg-brand-light font-black text-brand/50`}>{initialsFromName(name)}</span>;
  }
  return <img
    src={src}
    alt=""
    loading="lazy"
    className={className}
    ref={element => {
      // A server-rendered image can fail before hydration attaches onError.
      if (element?.complete && element.naturalWidth === 0) setFailedSrc(src);
    }}
    onError={() => setFailedSrc(src)}
  />;
}
