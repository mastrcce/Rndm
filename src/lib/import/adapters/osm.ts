import fs from "node:fs";
import path from "node:path";
import { stateForPoint } from "../../state-lookup";
import type { AdapterResult, ImportLogger, SourceRecord } from "../types";
import { nearestPlace } from "../nearest-place";
import { normalizeOsm, productCategories, type OsmElement } from "./osm-normalize";

/**
 * OpenStreetMap-Adapter.
 *
 * farmshops.eu zeigt ausschließlich OpenStreetMap-Daten an. Statt die Website zu scrapen,
 * nutzt dieser Adapter dieselben offenen Daten auf drei erlaubten Wegen:
 *
 *  1. `overpass`  – Live-Abfrage der Overpass-API (nur Deutschland, nur Milch-relevante Tags)
 *  2. `snapshot`  – lokaler Klon des Open-Source-Repositorys von farmshops.eu
 *                   (github.com/CodeforKarlsruhe/farmshops.eu, Verzeichnis data/)
 *  3. `seed`      – die im Repository mitgelieferte, bereits gefilterte Datei data/seed/osm-hofprodukte-de.json
 *
 * Lizenz der Daten: ODbL 1.0, © OpenStreetMap-Mitwirkende.
 */

export const OVERPASS_QUERY = `
[out:json][timeout:600];
area["ISO3166-1"="DE"][admin_level=2]->.de;
(
  nwr(area.de)[vending~"milk"];
  nwr(area.de)["vending:milk"="yes"];
  nwr(area.de)["vending:raw_milk"="yes"];
  nwr(area.de)[milk][milk!=no];
  nwr(area.de)["drink:raw_milk"];
  nwr(area.de)["drink:milk"];
  nwr(area.de)["food:milk"];
  nwr(area.de)[shop=farm][~"^(product|products|produce)$"~"milk"];
  nwr(area.de)[shop=farm][name~"[Mm]ilch"];
  nwr(area.de)[amenity=vending_machine][name~"[Mm]ilch"];
  nwr(area.de)[vending~"egg|honey|meat|sausage|cheese"][vending!=animal_food];
  nwr(area.de)[shop=farm][~"^(product|products|produce)$"~"egg|honey|meat|sausage|cheese"];
  nwr(area.de)[shop=farm][name~"[Ee]ier|[Hh]onig|[Ff]leisch|[Ww]urst|[Kk]äse"];
  nwr(area.de)[craft=beekeeper];
);
out center tags;
`.trim();

type OverpassElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function fetchOverpass(log: ImportLogger): Promise<OsmElement[]> {
  const url = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";
  log(`Overpass-Abfrage an ${url} …`);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      // Overpass verlangt einen beschreibenden User-Agent.
      "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "rohmilch-atlas/0.1",
    },
    body: new URLSearchParams({ data: OVERPASS_QUERY }).toString(),
    signal: AbortSignal.timeout(11 * 60 * 1000),
  });
  if (!res.ok) throw new Error(`Overpass antwortete mit HTTP ${res.status}`);
  const json = (await res.json()) as { elements: OverpassElement[] };
  const out: OsmElement[] = [];
  for (const e of json.elements) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (lat == null || lon == null || !e.tags) continue;
    out.push({ osmType: e.type, osmId: e.id, lat, lon, tags: e.tags });
  }
  log(`Overpass: ${out.length} Objekte empfangen.`);
  return out;
}

type GeoJsonFeature = {
  id?: string;
  properties: Record<string, string>;
  geometry: { type: string; coordinates: unknown };
};

function centroid(geometry: GeoJsonFeature["geometry"]): [number, number] | null {
  if (geometry.type === "Point") return geometry.coordinates as [number, number];
  const pts: number[][] = [];
  const walk = (c: unknown) => {
    if (Array.isArray(c) && typeof c[0] === "number") pts.push(c as number[]);
    else if (Array.isArray(c)) c.forEach(walk);
  };
  walk(geometry.coordinates);
  if (!pts.length) return null;
  const sx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const sy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  return [sx, sy];
}

function parseDetailsFile(text: string): GeoJsonFeature[] {
  // update_data.js von farmshops.eu hängt bei Kollisionen an – daher ggf. mehrere JSON-Objekte.
  try {
    return [JSON.parse(text) as GeoJsonFeature];
  } catch {
    return text
      .split(/(?<=\})(?=\{"type")/)
      .flatMap((s) => {
        try {
          return [JSON.parse(s) as GeoJsonFeature];
        } catch {
          return [];
        }
      });
  }
}

/** Liest den data/-Ordner eines farmshops.eu-Klons. */
export function readFarmshopsSnapshot(dir: string, log: ImportLogger): OsmElement[] {
  const dataDir = fs.existsSync(path.join(dir, "data")) ? path.join(dir, "data") : dir;
  const out: OsmElement[] = [];
  for (const osmType of ["node", "way", "relation"] as const) {
    const typeDir = path.join(dataDir, osmType);
    if (!fs.existsSync(typeDir)) continue;
    for (const id of fs.readdirSync(typeDir)) {
      const file = path.join(typeDir, id, "details.json");
      if (!fs.existsSync(file)) continue;
      for (const f of parseDetailsFile(fs.readFileSync(file, "utf8"))) {
        const c = centroid(f.geometry);
        if (!c) continue;
        const tags = { ...f.properties };
        delete tags.id;
        out.push({ osmType, osmId: id, lon: c[0], lat: c[1], tags });
      }
    }
  }
  const lastUpdate = path.join(dataDir, "farmshopGeoJson.js");
  if (fs.existsSync(lastUpdate)) {
    const head = fs.readFileSync(lastUpdate, "utf8").slice(0, 200);
    const m = head.match(/lastUpdate = "([^"]+)"/);
    if (m) log(`farmshops.eu-Snapshot: ${m[1]}`);
  }
  log(`Snapshot: ${out.length} OSM-Objekte gelesen.`);
  return out;
}

export type SeedFile = {
  generatedAt: string;
  source: string;
  license: string;
  elements: OsmElement[];
};

export const SEED_PATH = path.join(process.cwd(), "data", "seed", "osm-hofprodukte-de.json");

export function readSeed(log: ImportLogger): OsmElement[] {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8")) as SeedFile;
  log(`Seed-Datei (${seed.source}, Stand ${seed.generatedAt}): ${seed.elements.length} Objekte.`);
  return seed.elements;
}

/** Filtert auf Deutschland + Milchbezug und normalisiert. */
export function osmToRecords(elements: OsmElement[], mode: string, log: ImportLogger): AdapterResult {
  const skipped: Record<string, number> = {};
  const skip = (reason: string) => (skipped[reason] = (skipped[reason] ?? 0) + 1);
  const records: SourceRecord[] = [];
  const seen = new Set<string>();

  for (const el of elements) {
    const key = `${el.osmType}/${el.osmId}`;
    if (seen.has(key)) {
      skip("doppelt im Abzug");
      continue;
    }
    seen.add(key);
    if (productCategories(el.tags).length === 0) {
      skip("kein passendes Produkt (Milch, Eier, Honig, Fleisch, Käse)");
      continue;
    }
    const country = el.tags["addr:country"];
    if (country && country !== "DE") {
      skip("Land ≠ DE");
      continue;
    }
    const state = stateForPoint(el.lat, el.lon);
    if (!state) {
      skip("außerhalb Deutschlands");
      continue;
    }
    const normalized = normalizeOsm(el, state);
    if (!normalized.name && !normalized.city && !normalized.operator) {
      normalized.nearbyPlace = nearestPlace(el.lat, el.lon);
    }
    if (normalized.categories.length === 0) {
      skip("nur pasteurisierte Milch laut Quelle");
      continue;
    }
    records.push({ normalized, raw: { type: el.osmType, id: el.osmId, tags: el.tags } });
  }
  log(`Gefiltert: ${records.length} Standorte in Deutschland mit Hofprodukten.`);
  const perCat: Record<string, number> = {};
  for (const r of records) for (const c of r.normalized.categories) perCat[c] = (perCat[c] ?? 0) + 1;
  log(`  nach Kategorie: ${Object.entries(perCat).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  for (const [k, v] of Object.entries(skipped)) log(`  übersprungen (${k}): ${v}`);
  return { records, scanned: elements.length, skipped, complete: true, mode };
}

/** Wählt die für Deutschland relevante Teilmenge (Standorte mit Hofprodukten) für die Seed-Datei aus. */
export function filterProductElements(elements: OsmElement[]): OsmElement[] {
  return elements.filter((el) => productCategories(el.tags).length > 0 && stateForPoint(el.lat, el.lon) !== null);
}
