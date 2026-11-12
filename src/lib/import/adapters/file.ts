import Papa from "papaparse";
import { CATEGORIES, LOCATION_TYPES, type Category, type LocationType, type RawMilkStatus } from "../../categories";
import { stateForPoint } from "../../state-lookup";
import { stateByName } from "../../states";
import { nearestPlace } from "../nearest-place";
import type { AdapterResult, ImportLogger, NormalizedLocation, SourceRecord } from "../types";

/**
 * Generische Datei-Schnittstelle (CSV oder JSON).
 *
 * Gedacht für Daten, die nicht automatisch abgerufen werden können, z. B. ein
 * genehmigter Export von Findhilde.de oder eine eigene Recherche-Liste.
 * Spaltennamen dürfen deutsch oder englisch sein – siehe ALIASES und docs/IMPORT-FORMAT.md.
 */

const ALIASES: Record<string, string[]> = {
  source_id: ["source_id", "id", "quell_id", "external_id"],
  name: ["name", "betrieb", "bezeichnung", "title"],
  address: ["address", "adresse", "strasse", "straße", "street"],
  postal_code: ["postal_code", "plz", "postcode", "zip"],
  city: ["city", "ort", "stadt", "gemeinde"],
  state: ["state", "bundesland"],
  latitude: ["latitude", "lat", "breitengrad"],
  longitude: ["longitude", "lon", "lng", "laengengrad", "längengrad"],
  location_type: ["location_type", "type", "typ", "art"],
  phone: ["phone", "telefon", "tel"],
  email: ["email", "e-mail", "mail"],
  website: ["website", "webseite", "url", "homepage"],
  opening_hours: ["opening_hours", "oeffnungszeiten", "öffnungszeiten"],
  price_per_liter: ["price_per_liter", "preis_pro_liter", "preis", "price"],
  payment_methods: ["payment_methods", "zahlungsarten", "zahlung", "payment"],
  description: ["description", "beschreibung"],
  notes: ["notes", "hinweise", "hinweis"],
  raw_milk: ["raw_milk", "rohmilch"],
  categories: ["categories", "kategorien", "produkte", "products"],
  organic: ["organic", "bio"],
  image_url: ["image_url", "bild", "image"],
  source_url: ["source_url", "quelle_url", "link"],
  last_verified_at: ["last_verified_at", "geprueft_am", "geprüft_am", "stand"],
};

const TYPE_ALIASES: Record<string, LocationType> = {
  rohmilchautomat: "raw_milk_vending",
  milchautomat: "raw_milk_vending",
  milchtankstelle: "raw_milk_vending",
  automat: "vending_machine",
  verkaufsautomat: "vending_machine",
  hofladen: "farm_shop",
  bauernhof: "farm",
  hof: "farm",
  direktverkauf: "direct_sale",
  imker: "beekeeper",
  imkerei: "beekeeper",
  sonstige: "direct_sale",
};

function pick(row: Record<string, unknown>, field: string): string | null {
  const keys = Object.keys(row);
  for (const alias of ALIASES[field]) {
    const k = keys.find((x) => x.trim().toLowerCase() === alias);
    if (k == null) continue;
    const v = row[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v.replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function yesNo(v: string | null): boolean | null {
  if (v == null) return null;
  if (/^(ja|yes|true|1|x)$/i.test(v)) return true;
  if (/^(nein|no|false|0)$/i.test(v)) return false;
  return null;
}

const CATEGORY_ALIASES: Record<string, Category> = {
  milch: "milk", milk: "milk", rohmilch: "milk",
  eier: "eggs", ei: "eggs", eggs: "eggs", egg: "eggs",
  honig: "honey", honey: "honey",
  fleisch: "meat", wurst: "meat", "fleisch & wurst": "meat", meat: "meat", sausage: "meat",
  käse: "cheese", kaese: "cheese", cheese: "cheese",
};

/** „Milch|Eier, Honig“ -> ["milk","eggs","honey"]. Ohne Angabe: Milch (Rückwärtskompatibilität). */
export function parseCategories(v: string | null): Category[] {
  if (!v) return ["milk"];
  const found = new Set(v.split(/[;,|/]/).map((x) => CATEGORY_ALIASES[x.trim().toLowerCase()]).filter(Boolean));
  return CATEGORIES.filter((c) => found.has(c));
}

function parseType(v: string | null): LocationType {
  if (!v) return "direct_sale";
  const k = v.trim().toLowerCase();
  if ((LOCATION_TYPES as readonly string[]).includes(k)) return k as LocationType;
  return TYPE_ALIASES[k] ?? "direct_sale";
}

export function parseFileContent(content: string, filename: string): Record<string, unknown>[] {
  if (/\.json$/i.test(filename) || content.trim().startsWith("[") || content.trim().startsWith("{")) {
    const json = JSON.parse(content) as unknown;
    if (Array.isArray(json)) return json as Record<string, unknown>[];
    const obj = json as { features?: { properties: Record<string, unknown>; geometry?: { coordinates: number[] } }[]; locations?: Record<string, unknown>[] };
    if (obj.features) {
      // GeoJSON FeatureCollection
      return obj.features.map((f) => ({
        ...f.properties,
        longitude: f.geometry?.coordinates?.[0],
        latitude: f.geometry?.coordinates?.[1],
      }));
    }
    if (obj.locations) return obj.locations;
    throw new Error("JSON muss ein Array, {locations: [...]} oder eine GeoJSON-FeatureCollection sein.");
  }
  const parsed = Papa.parse<Record<string, unknown>>(content, {
    header: true,
    skipEmptyLines: true,
    delimitersToGuess: [",", ";", "\t"],
  });
  if (parsed.errors.length) {
    const e = parsed.errors[0];
    throw new Error(`CSV-Fehler in Zeile ${e.row}: ${e.message}`);
  }
  return parsed.data;
}

export function fileToRecords(
  rows: Record<string, unknown>[],
  sourceKey: string,
  mode: string,
  log: ImportLogger,
): AdapterResult {
  const records: SourceRecord[] = [];
  const skipped: Record<string, number> = {};
  const skip = (r: string) => (skipped[r] = (skipped[r] ?? 0) + 1);

  rows.forEach((row, i) => {
    const lat = num(pick(row, "latitude"));
    const lon = num(pick(row, "longitude"));
    if (lat == null || lon == null || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      skip("keine gültigen Koordinaten");
      return;
    }
    const geoState = stateForPoint(lat, lon);
    if (!geoState) {
      skip("außerhalb Deutschlands");
      return;
    }
    const name = pick(row, "name");
    const raw = yesNo(pick(row, "raw_milk"));
    const rawMilkStatus: RawMilkStatus = raw === true ? "confirmed" : raw === false ? "not_raw" : "unconfirmed";
    let categories = parseCategories(pick(row, "categories"));
    if (raw === true && !categories.includes("milk")) categories = ["milk", ...categories];
    if (rawMilkStatus === "not_raw") categories = categories.filter((c) => c !== "milk");
    if (categories.length === 0) {
      skip("keine passende Produktkategorie");
      return;
    }
    const hours = pick(row, "opening_hours");
    const flags: string[] = [];
    if (!name) flags.push("no_name");
    if (!pick(row, "address")) flags.push("no_address");
    if (!pick(row, "city")) flags.push("no_city");
    if (!hours) flags.push("no_opening_hours");
    const stateCol = stateByName(pick(row, "state"))?.name;
    if (stateCol && stateCol !== geoState) flags.push("state_mismatch");
    const organic = yesNo(pick(row, "organic"));
    const type = parseType(pick(row, "location_type"));
    const website = pick(row, "website");
    const verified = pick(row, "last_verified_at");
    const price = num(pick(row, "price_per_liter"));

    const normalized: NormalizedLocation = {
      source: sourceKey,
      sourceId: pick(row, "source_id") ?? `${mode}#${i + 1}:${lat.toFixed(5)},${lon.toFixed(5)}`,
      sourceUrl: pick(row, "source_url"),
      name,
      address: pick(row, "address"),
      postalCode: pick(row, "postal_code"),
      city: pick(row, "city"),
      state: geoState,
      country: "DE",
      latitude: lat,
      longitude: lon,
      locationType: type,
      salesTypes: type === "raw_milk_vending" || type === "vending_machine" ? ["automat"] : type === "farm_shop" ? ["hofladen", "direktverkauf"] : ["direktverkauf"],
      rawMilkStatus,
      categories,
      products: [...categories],
      description: pick(row, "description"),
      notes: pick(row, "notes"),
      phone: pick(row, "phone"),
      email: pick(row, "email"),
      website: website && !/^https?:\/\//i.test(website) ? `https://${website}` : website,
      openingHours: hours,
      is247: hours ? /^24\/7$/.test(hours) : null,
      pricePerLiter: price != null && price > 0 && price < 20 ? price : null,
      paymentMethods: (pick(row, "payment_methods") ?? "")
        .split(/[;,|]/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      organicStatus: organic ? "claimed" : null,
      organicLabel: null,
      imageUrl: pick(row, "image_url"),
      lastVerifiedAt: verified && !Number.isNaN(Date.parse(verified)) ? new Date(verified).toISOString().slice(0, 10) : null,
      qualityFlags: flags,
      operator: null,
      nearbyPlace: name || pick(row, "city") ? null : nearestPlace(lat, lon),
    };
    records.push({ normalized, raw: row });
  });

  log(`Datei: ${rows.length} Zeilen, ${records.length} gültige Standorte.`);
  for (const [k, v] of Object.entries(skipped)) log(`  übersprungen (${k}): ${v}`);
  // Datei-Importe gelten als Teilmengen: fehlende Einträge werden nicht deaktiviert.
  return { records, scanned: rows.length, skipped, complete: false, mode };
}
