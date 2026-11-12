import fs from "node:fs";
import { distanceMeters } from "../geo";
import { PLACES_SEED_PATH, type PlaceSeed } from "./places";

let cities: PlaceSeed[] | null = null;

/**
 * Nächstgelegener bekannter Ort (aus OSM-Adressangaben), max. 8 km entfernt.
 * Wird nur für die Bezeichnung namenloser Standorte genutzt („Milchautomat bei …“),
 * nie als Adresse.
 */
export function nearestPlace(lat: number, lon: number, maxMeters = 8000): string | null {
  if (!cities) {
    cities = fs.existsSync(PLACES_SEED_PATH)
      ? (JSON.parse(fs.readFileSync(PLACES_SEED_PATH, "utf8")) as PlaceSeed[]).filter((p) => p.kind === "city")
      : [];
  }
  let best: { name: string; d: number } | null = null;
  for (const c of cities) {
    if (Math.abs(c.lat - lat) > 0.08 || Math.abs(c.lon - lon) > 0.12) continue;
    const d = distanceMeters({ lat, lon }, { lat: c.lat, lon: c.lon });
    if (d <= maxMeters && (!best || d < best.d)) best = { name: c.name, d };
  }
  return best?.name ?? null;
}
