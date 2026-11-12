import "server-only";
import { query } from "../db";
import { searchPlaces } from "../locations";
import type { PlaceResult } from "../types";

let lastNominatimCall = 0;

/** Ortssuche: zuerst lokales Ortsverzeichnis, dann (optional) Nominatim mit Cache und Ratenbegrenzung. */
export async function geocode(q: string): Promise<PlaceResult[]> {
  const local = await searchPlaces(q);
  const looksLikeAddress = /\d/.test(q) && /[a-zäöüß]{3,}/i.test(q);
  if (local.length && !looksLikeAddress) return local;

  const base = process.env.NOMINATIM_URL;
  if (!base) return local;
  const key = q.trim().toLowerCase();
  const cached = await query<{ result: PlaceResult[] }>("select result from geocode_cache where query = $1", [key]);
  if (cached[0]) return [...cached[0].result, ...local].slice(0, 6);

  // Nominatim-Nutzungsrichtlinie: max. 1 Anfrage pro Sekunde
  const wait = lastNominatimCall + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastNominatimCall = Date.now();
  try {
    const url = new URL("/search", base);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("countrycodes", "de");
    url.searchParams.set("limit", "5");
    url.searchParams.set("accept-language", "de");
    const res = await fetch(url, {
      headers: { "User-Agent": process.env.NOMINATIM_USER_AGENT ?? "rohmilch-finder/0.1" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return local;
    const json = (await res.json()) as { display_name: string; lat: string; lon: string; boundingbox?: string[]; addresstype?: string }[];
    const results: PlaceResult[] = json.map((r) => ({
      kind: "address",
      label: r.display_name.replace(/, Deutschland$/, ""),
      lat: Number(r.lat),
      lon: Number(r.lon),
      bbox: r.boundingbox
        ? [Number(r.boundingbox[2]), Number(r.boundingbox[0]), Number(r.boundingbox[3]), Number(r.boundingbox[1])]
        : null,
      source: "Nominatim / OpenStreetMap",
    }));
    await query("insert into geocode_cache (query, result) values ($1, $2) on conflict (query) do update set result = $2, created_at = now()", [key, JSON.stringify(results)]);
    return [...results, ...local].slice(0, 6);
  } catch {
    return local;
  }
}
