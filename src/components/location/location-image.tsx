"use client";

import { useState } from "react";

/** Externes Foto, das sich bei Ladefehlern selbst ausblendet. */
export function LocationImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} loading="lazy" className="h-48 w-full object-cover" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  );
}
