"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const KEY = "rohmilch:favoriten";
const EVENT = "rohmilch:favoriten-changed";

function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parse(raw: string): string[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Favoriten werden ausschließlich lokal im Browser gespeichert (kein Konto, keine Übertragung). */
export function useFavorites() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "[]");
  const ids = useMemo(() => parse(raw), [raw]);
  const toggle = useCallback((id: string) => {
    const cur = parse(readRaw());
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* Speicher nicht verfügbar */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return { ids, has: (id: string) => ids.includes(id), toggle };
}
