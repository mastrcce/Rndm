import fs from "node:fs";
import path from "node:path";
import { featureBbox, featureContains, type GeoFeature } from "./geo";

type StateFeature = GeoFeature & { properties: { id: string; name: string } };

let cache: { features: StateFeature[]; bboxes: [number, number, number, number][] } | null = null;

function load() {
  if (cache) return cache;
  const file = path.join(process.cwd(), "data", "geo", "bundeslaender.geo.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8")) as { features: StateFeature[] };
  cache = { features: json.features, bboxes: json.features.map(featureBbox) };
  return cache;
}

/**
 * Ermittelt das Bundesland zu einer Koordinate. Gibt null zurück, wenn der Punkt
 * außerhalb Deutschlands liegt. Grenzgebiete werden mit einer kleinen Toleranz geprüft,
 * da die Grenzpolygone generalisiert sind.
 */
export function stateForPoint(lat: number, lon: number): string | null {
  const { features, bboxes } = load();
  for (let i = 0; i < features.length; i++) {
    const [minX, minY, maxX, maxY] = bboxes[i];
    if (lon < minX || lon > maxX || lat < minY || lat > maxY) continue;
    if (featureContains(features[i], lon, lat)) return features[i].properties.name;
  }
  // Toleranz ~1 km für generalisierte Küsten/Grenzen
  const d = 0.012;
  for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
    for (let i = 0; i < features.length; i++) {
      if (featureContains(features[i], lon + dx, lat + dy)) return features[i].properties.name;
    }
  }
  return null;
}

export function stateBboxes(): Record<string, [number, number, number, number]> {
  const { features, bboxes } = load();
  return Object.fromEntries(features.map((f, i) => [f.properties.name, bboxes[i]]));
}
