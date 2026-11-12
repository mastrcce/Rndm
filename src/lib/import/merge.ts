import { createHash } from "node:crypto";
import { LOCATION_TYPE_LABELS, type LocationType } from "../categories";
import { distanceMeters } from "../geo";
import { nameSimilarity, normalizeStreet, slugify } from "../text";
import type { NormalizedLocation } from "./types";

export const AUTO_MERGE_SCORE = 0.85;
export const REVIEW_SCORE = 0.55;
export const MATCH_RADIUS_M = 300;

export type MatchCandidate = {
  name: string | null;
  nameIsGenerated?: boolean;
  address: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  locationType: LocationType;
};

export type MatchResult = { score: number; distance: number; reasons: string[] };

const VENDING: LocationType[] = ["raw_milk_vending", "vending_machine"];
const FARM: LocationType[] = ["farm_shop", "farm"];

function typesCompatible(a: LocationType, b: LocationType): boolean {
  if (a === b) return true;
  if (VENDING.includes(a) && VENDING.includes(b)) return true;
  if (FARM.includes(a) && FARM.includes(b)) return true;
  return false;
}

/**
 * Bewertet, ob zwei Datensätze denselben realen Standort beschreiben.
 * Kombiniert Entfernung, Namensähnlichkeit, Adresse und Standorttyp.
 */
export function matchScore(a: MatchCandidate, b: MatchCandidate): MatchResult {
  const distance = distanceMeters(
    { lat: a.latitude, lon: a.longitude },
    { lat: b.latitude, lon: b.longitude },
  );
  const reasons: string[] = [];
  if (distance > MATCH_RADIUS_M) return { score: 0, distance, reasons };

  const nameA = a.nameIsGenerated ? null : a.name;
  const nameB = b.nameIsGenerated ? null : b.name;
  const nameSim = nameSimilarity(nameA, nameB);
  const streetA = normalizeStreet(a.address);
  const sameAddress =
    !!streetA && streetA === normalizeStreet(b.address) && !!a.postalCode && a.postalCode === b.postalCode;
  const compatible = typesCompatible(a.locationType, b.locationType);
  const bothNamed = !!nameA && !!nameB;

  if (sameAddress) reasons.push("gleiche Adresse");
  if (nameSim >= 0.5) reasons.push(`Namensähnlichkeit ${(nameSim * 100).toFixed(0)} %`);
  reasons.push(`${Math.round(distance)} m Abstand`);
  if (compatible) reasons.push("gleiche Standortart");

  let score = 0;
  if (sameAddress && compatible) score = 0.95;
  else if (sameAddress) score = 0.7;
  else if (distance < 15 && compatible && (!bothNamed || nameSim >= 0.3)) score = 0.9;
  else if (distance < 60 && nameSim >= 0.8) score = compatible ? 0.92 : 0.75;
  else if (distance < 150 && nameSim >= 0.9 && compatible) score = 0.86;
  else if (distance < 40 && compatible) score = bothNamed && nameSim < 0.3 ? 0.4 : 0.7;
  else if (distance < 120 && nameSim >= 0.5) score = 0.6;
  else if (distance < 25) score = 0.55; // z. B. Hofladen und Automat am selben Hof
  return { score, distance, reasons };
}

// ---------------------------------------------------------------------------
// Zusammenführen mehrerer Quelldatensätze zu einem kanonischen Standort
// ---------------------------------------------------------------------------

export type CanonicalFields = {
  name: string;
  name_is_generated: boolean;
  address: string | null;
  postal_code: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  location_type: LocationType;
  sales_types: string[];
  raw_milk_status: NormalizedLocation["rawMilkStatus"];
  products: string[];
  description: string | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  opening_hours: string | null;
  is_24_7: boolean | null;
  price_per_liter: number | null;
  payment_methods: string[];
  organic_status: "verified" | "claimed" | null;
  organic_label: string | null;
  image_url: string | null;
  source: string;
  source_url: string | null;
  last_verified_at: string | null;
  data_quality_score: number;
  quality_flags: string[];
};

export type RankedSource = { normalized: NormalizedLocation; priority: number };

function filled(n: NormalizedLocation): number {
  return Object.values(n).filter((v) => v != null && !(Array.isArray(v) && v.length === 0)).length;
}

export function generatedName(
  n: Pick<NormalizedLocation, "locationType" | "city" | "operator" | "state" | "nearbyPlace">,
): string {
  const label = LOCATION_TYPE_LABELS[n.locationType];
  if (n.city) return `${label} in ${n.city}`;
  if (n.operator) return `${label} – ${n.operator}`;
  if (n.nearbyPlace) return `${label} bei ${n.nearbyPlace}`;
  if (n.state) return `${label} in ${n.state}`;
  return label;
}

export function mergeSources(sources: RankedSource[]): CanonicalFields {
  if (sources.length === 0) throw new Error("mergeSources: keine Quellen");
  const ordered = [...sources].sort((a, b) => a.priority - b.priority || filled(b.normalized) - filled(a.normalized));
  const primary = ordered[0].normalized;
  const first = <K extends keyof NormalizedLocation>(k: K): NormalizedLocation[K] | null => {
    for (const s of ordered) {
      const v = s.normalized[k];
      if (v != null && !(typeof v === "string" && v.trim() === "")) return v;
    }
    return null;
  };
  const union = (k: "salesTypes" | "products" | "paymentMethods"): string[] =>
    [...new Set(ordered.flatMap((s) => s.normalized[k]))].sort();

  // Adresse als Block übernehmen, damit Straße/PLZ/Ort nicht aus verschiedenen Quellen gemischt werden.
  const addrSource = ordered.find((s) => s.normalized.address)?.normalized ?? ordered.find((s) => s.normalized.city)?.normalized ?? primary;

  const rawStatuses = ordered.map((s) => s.normalized.rawMilkStatus);
  const rawMilk = rawStatuses.includes("confirmed") ? "confirmed" : "unconfirmed";

  const realName = first("name");
  const city = addrSource.city ?? first("city");
  const verifiedDates = ordered.map((s) => s.normalized.lastVerifiedAt).filter((d): d is string => !!d).sort();

  const flags = new Set<string>();
  for (const s of ordered) for (const f of s.normalized.qualityFlags) flags.add(f);
  if (realName) flags.delete("no_name");
  if (addrSource.address) flags.delete("no_address");
  if (city) flags.delete("no_city");
  if (first("openingHours")) flags.delete("no_opening_hours");
  if (sources.length > 1) flags.add("multi_source");

  const canonical: CanonicalFields = {
    name: realName ?? generatedName({ ...primary, city }),
    name_is_generated: !realName,
    address: addrSource.address,
    postal_code: addrSource.postalCode,
    city,
    state: primary.state ?? first("state"),
    country: "DE",
    latitude: primary.latitude,
    longitude: primary.longitude,
    location_type: primary.locationType,
    sales_types: union("salesTypes"),
    raw_milk_status: rawMilk,
    products: union("products"),
    description: first("description"),
    notes: first("notes"),
    phone: first("phone"),
    email: first("email"),
    website: first("website"),
    opening_hours: first("openingHours"),
    is_24_7: first("is247"),
    price_per_liter: first("pricePerLiter"),
    payment_methods: union("paymentMethods"),
    organic_status: ordered.some((s) => s.normalized.organicStatus === "verified")
      ? "verified"
      : first("organicStatus"),
    organic_label: first("organicLabel"),
    image_url: first("imageUrl"),
    source: primary.source,
    source_url: primary.sourceUrl,
    last_verified_at: verifiedDates.length ? verifiedDates[verifiedDates.length - 1] : null,
    data_quality_score: 0,
    quality_flags: [...flags].sort(),
  };
  canonical.data_quality_score = qualityScore(canonical);
  return canonical;
}

/** Datenqualität 0–100: wie vollständig und aktuell ist der Datensatz? */
export function qualityScore(c: Pick<CanonicalFields,
  "name_is_generated" | "address" | "postal_code" | "city" | "opening_hours" | "phone" | "website" |
  "raw_milk_status" | "payment_methods" | "price_per_liter" | "image_url" | "last_verified_at" | "quality_flags">,
  now: Date = new Date()): number {
  let s = 0;
  if (!c.name_is_generated) s += 15;
  if (c.address) s += 15;
  if (c.postal_code && c.city) s += 10;
  else if (c.city) s += 5;
  if (c.opening_hours) s += 15;
  if (c.phone || c.website) s += 10;
  if (c.raw_milk_status === "confirmed") s += 10;
  if (c.payment_methods.length) s += 5;
  if (c.price_per_liter != null) s += 5;
  if (c.image_url) s += 5;
  if (c.last_verified_at) {
    const ageDays = (now.getTime() - Date.parse(c.last_verified_at)) / 86_400_000;
    if (ageDays < 365) s += 10;
    else if (ageDays < 3 * 365) s += 5;
  }
  if (c.quality_flags.includes("osm_fixme")) s -= 10;
  if (c.quality_flags.includes("possibly_disused")) s -= 20;
  return Math.max(0, Math.min(100, s));
}

export function contentHash(n: NormalizedLocation): string {
  return createHash("sha1").update(JSON.stringify(n)).digest("hex");
}

export function baseSlug(name: string, city: string | null): string {
  const s = slugify(city && !name.toLowerCase().includes(city.toLowerCase()) ? `${name} ${city}` : name);
  return s || "standort";
}

export function shortHash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 6);
}

/** Vergleicht zwei Feldwerte und liefert ein Diff-Objekt für das Änderungsprotokoll. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  ignore: string[] = [],
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of Object.keys(after)) {
    if (ignore.includes(k)) continue;
    const a = normalizeValue(before[k]);
    const b = normalizeValue(after[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) diff[k] = { from: before[k] ?? null, to: after[k] ?? null };
  }
  return diff;
}

function normalizeValue(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10);
  if (typeof v === "string" && /^-?\d+\.\d+$/.test(v)) return Number(v);
  if (Array.isArray(v)) return [...v].sort();
  return v ?? null;
}
