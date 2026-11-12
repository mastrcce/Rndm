export type LatLon = { lat: number; lon: number };

const EARTH_RADIUS_M = 6_371_000;

/** Entfernung in Metern (Haversine). */
export function distanceMeters(a: LatLon, b: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  if (meters < 10_000) return `${(meters / 1000).toFixed(1).replace(".", ",")} km`;
  return `${Math.round(meters / 1000)} km`;
}

type Ring = number[][];
type Polygon = Ring[];

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygon(lon: number, lat: number, poly: Polygon): boolean {
  if (!pointInRing(lon, lat, poly[0])) return false;
  for (let k = 1; k < poly.length; k++) if (pointInRing(lon, lat, poly[k])) return false;
  return true;
}

export type GeoFeature = {
  properties: Record<string, unknown>;
  geometry: { type: "Polygon"; coordinates: Polygon } | { type: "MultiPolygon"; coordinates: Polygon[] };
};

export function featureContains(feature: GeoFeature, lon: number, lat: number): boolean {
  const g = feature.geometry;
  if (g.type === "Polygon") return pointInPolygon(lon, lat, g.coordinates);
  return g.coordinates.some((p) => pointInPolygon(lon, lat, p));
}

export function featureBbox(feature: GeoFeature): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const polys = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  for (const p of polys) for (const [x, y] of p[0]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return [minX, minY, maxX, maxY];
}

export const GERMANY_BOUNDS: [[number, number], [number, number]] = [
  [47.27, 5.87],
  [55.06, 15.04],
];
