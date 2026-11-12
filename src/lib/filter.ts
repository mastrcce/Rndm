import type { LocationType } from "./categories";
import { distanceMeters, type LatLon } from "./geo";
import type { MapPoint } from "./types";

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

export type FilterState = {
  /** Leere Liste = alle Arten */
  types: LocationType[];
  onlyRawConfirmed: boolean;
  open247: boolean;
  openNow: boolean;
  organic: boolean;
  payments: string[];
  /** Umkreis in km (nur wirksam, wenn ein Bezugspunkt gesetzt ist) */
  radiusKm: number | null;
  text: string;
};

export const DEFAULT_FILTERS: FilterState = {
  types: [],
  onlyRawConfirmed: false,
  open247: false,
  openNow: false,
  organic: false,
  payments: [],
  radiusKm: null,
  text: "",
};

export type SortMode = "distance" | "name" | "quality";

export type Bounds = { south: number; west: number; north: number; east: number };

export type ResultPoint = MapPoint & { distance: number | null };

/** Gruppen von Zahlungsarten für den Filter (OSM kennt viele Detail-Schlüssel). */
export const PAYMENT_FILTERS: Record<string, { label: string; keys: string[] }> = {
  cash: { label: "Bargeld", keys: ["cash", "coins", "notes"] },
  card: {
    label: "Karte",
    keys: ["debit_cards", "girocard", "credit_cards", "cards", "visa", "mastercard", "maestro", "contactless", "electronic_purses"],
  },
  digital: { label: "App / PayPal", keys: ["app", "paypal", "twint", "apple_pay", "google_pay", "sumup"] },
};

export function matchesText(p: MapPoint, text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return true;
  return [p.name, p.city, p.pc, p.state, p.addr].some((v) => v?.toLowerCase().includes(t));
}

export function applyFilters(
  points: MapPoint[],
  f: FilterState,
  origin: LatLon | null,
  isOpenNow?: (p: MapPoint) => boolean | null,
): ResultPoint[] {
  const out: ResultPoint[] = [];
  for (const p of points) {
    if (f.types.length && !f.types.includes(p.type)) continue;
    if (f.onlyRawConfirmed && p.raw !== "confirmed") continue;
    if (f.open247 && p.h24 !== true) continue;
    if (f.organic && !p.org) continue;
    if (f.payments.length) {
      const ok = f.payments.every((group) => PAYMENT_FILTERS[group]?.keys.some((k) => p.pay.includes(k)));
      if (!ok) continue;
    }
    if (f.openNow) {
      // Nur Standorte mit auswertbaren Öffnungszeiten, die laut Angabe jetzt geöffnet sind
      if (!isOpenNow || isOpenNow(p) !== true) continue;
    }
    if (!matchesText(p, f.text)) continue;
    const distance = origin ? distanceMeters(origin, { lat: p.lat, lon: p.lon }) : null;
    if (origin && f.radiusKm != null && distance! > f.radiusKm * 1000) continue;
    out.push({ ...p, distance });
  }
  return out;
}

export function inBounds(p: { lat: number; lon: number }, b: Bounds): boolean {
  return p.lat >= b.south && p.lat <= b.north && p.lon >= b.west && p.lon <= b.east;
}

export function sortResults(list: ResultPoint[], mode: SortMode): ResultPoint[] {
  const copy = [...list];
  if (mode === "distance" && copy.some((p) => p.distance != null)) {
    copy.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  } else if (mode === "quality") {
    copy.sort((a, b) => b.q - a.q || a.name.localeCompare(b.name, "de"));
  } else {
    copy.sort((a, b) => Number(a.gen) - Number(b.gen) || a.name.localeCompare(b.name, "de"));
  }
  return copy;
}

export function countActiveFilters(f: FilterState): number {
  return (
    f.types.length +
    Number(f.onlyRawConfirmed) +
    Number(f.open247) +
    Number(f.openNow) +
    Number(f.organic) +
    f.payments.length +
    Number(f.radiusKm != null)
  );
}
