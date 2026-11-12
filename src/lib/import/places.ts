import fs from "node:fs";
import path from "node:path";
import { pool } from "../db";
import { stateBboxes } from "../state-lookup";
import { STATES } from "../states";
import { slugify } from "../text";
import type { OsmElement } from "./adapters/osm-normalize";
import { stateForPoint } from "../state-lookup";

/**
 * Ortsverzeichnis für die Suche nach Stadt/PLZ ohne externen Dienst.
 * Grundlage: Adressangaben (addr:city / addr:postcode) aus OpenStreetMap-Objekten
 * des farmshops.eu-Abzugs sowie aller importierten Standorte. Koordinate = Mittelpunkt
 * aller Objekte mit dieser Angabe. Für Orte, die hier fehlen, gibt es den Nominatim-Fallback.
 */

export type PlaceSeed = { kind: "city" | "postal_code"; name: string; state: string | null; lat: number; lon: number; n: number };

export const PLACES_SEED_PATH = path.join(process.cwd(), "data", "seed", "places-de.json");

export function buildPlaceSeed(elements: OsmElement[]): PlaceSeed[] {
  const acc = new Map<string, { kind: PlaceSeed["kind"]; name: string; states: Map<string, number>; lat: number; lon: number; n: number }>();
  const add = (kind: PlaceSeed["kind"], name: string, state: string, lat: number, lon: number) => {
    const key = `${kind}:${kind === "city" ? slugify(name) : name}`;
    const e = acc.get(key) ?? { kind, name, states: new Map(), lat: 0, lon: 0, n: 0 };
    e.lat += lat;
    e.lon += lon;
    e.n++;
    e.states.set(state, (e.states.get(state) ?? 0) + 1);
    acc.set(key, e);
  };
  for (const el of elements) {
    const city = el.tags["addr:city"]?.trim();
    const plz = el.tags["addr:postcode"]?.trim();
    if (!city && !plz) continue;
    const state = stateForPoint(el.lat, el.lon);
    if (!state) continue;
    if (city && city.length < 60) add("city", city, state, el.lat, el.lon);
    if (plz && /^\d{5}$/.test(plz)) add("postal_code", plz, state, el.lat, el.lon);
  }
  return [...acc.values()].map((e) => ({
    kind: e.kind,
    name: e.name,
    state: [...e.states.entries()].sort((a, b) => b[1] - a[1])[0][0],
    lat: Number((e.lat / e.n).toFixed(5)),
    lon: Number((e.lon / e.n).toFixed(5)),
    n: e.n,
  }));
}

export async function rebuildPlaces(log: (l: string) => void) {
  const client = await pool().connect();
  try {
    await client.query("begin");
    await client.query("delete from places");
    const bboxes = stateBboxes();
    for (const s of STATES) {
      const b = bboxes[s.name];
      if (!b) continue;
      await client.query(
        `insert into places (kind, name, slug, state, latitude, longitude, bbox, source) values ('state',$1,$2,$1,$3,$4,$5,'Landesgrenzen')`,
        [s.name, s.slug, (b[1] + b[3]) / 2, (b[0] + b[2]) / 2, b],
      );
    }
    const seed: PlaceSeed[] = fs.existsSync(PLACES_SEED_PATH) ? JSON.parse(fs.readFileSync(PLACES_SEED_PATH, "utf8")) : [];
    // Städte & PLZ aus den Standorten selbst ergänzen
    const { rows } = await client.query<{ kind: "city" | "postal_code"; name: string; state: string; lat: number; lon: number; n: number }>(
      `select 'city' as kind, city as name, mode() within group (order by state) as state,
              avg(latitude) as lat, avg(longitude) as lon, count(*)::int as n
         from locations where is_active and city is not null group by city
       union all
       select 'postal_code', postal_code, mode() within group (order by state), avg(latitude), avg(longitude), count(*)::int
         from locations where is_active and postal_code ~ '^[0-9]{5}$' group by postal_code`,
    );
    const merged = new Map<string, PlaceSeed>();
    for (const p of [...seed, ...rows]) {
      const slug = p.kind === "city" ? slugify(p.name) : p.name;
      const key = `${p.kind}:${slug}`;
      const prev = merged.get(key);
      if (!prev || p.n > prev.n) merged.set(key, { ...p, lat: Number(p.lat), lon: Number(p.lon) });
    }
    for (const [key, p] of merged) {
      const slug = key.split(":")[1];
      if (!slug) continue;
      await client.query(
        `insert into places (kind, name, slug, state, latitude, longitude, source) values ($1,$2,$3,$4,$5,$6,'OSM-Adressen')
         on conflict (kind, slug) do nothing`,
        [p.kind, p.name, slug, p.state, p.lat, p.lon],
      );
    }
    await client.query("commit");
    log(`Ortsverzeichnis: ${merged.size + STATES.length} Einträge.`);
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}
