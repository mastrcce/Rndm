import { LOCATION_TYPE_COLORS, type LocationType } from "@/lib/categories";

// Kleine Piktogramme (24x24-Raster), weiß auf farbigem Pin
const GLYPHS: Record<LocationType, string> = {
  // Milchflasche
  raw_milk_vending:
    '<path d="M10 3h4v2l1.5 3v11a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V8L10 5z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8.6 12h6.8" stroke="#fff" stroke-width="1.8"/>',
  // Automat
  vending_machine:
    '<rect x="6.5" y="3.5" width="11" height="17" rx="1.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M9 7.5h6M9 11h6M9 16.5h3" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
  // Hofladen (Haus mit Markise)
  farm_shop:
    '<path d="M4.5 10.5 12 4l7.5 6.5V20h-15z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 20v-5h4v5" fill="none" stroke="#fff" stroke-width="1.8"/>',
  // Bauernhof (Scheune)
  farm:
    '<path d="M4 20V10l8-5 8 5v10z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 20v-6h6v6M9 14l6 6M15 14l-6 6" fill="none" stroke="#fff" stroke-width="1.5"/>',
  // Korb
  direct_sale:
    '<path d="M4 10h16l-1.6 9a1.5 1.5 0 0 1-1.5 1.2H7.1a1.5 1.5 0 0 1-1.5-1.2z" fill="none" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/><path d="M8 10l3-5M16 10l-3-5" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>',
};

export function markerHtml(type: LocationType, confirmed: boolean): string {
  const color = LOCATION_TYPE_COLORS[type];
  const ring = confirmed ? '<circle cx="27" cy="6" r="4.5" fill="#c99a4b" stroke="#fff" stroke-width="1.5"/>' : "";
  return `<div><svg width="34" height="42" viewBox="0 0 34 42" aria-hidden="true">
    <path d="M17 41c-1-1.4-13-14.7-13-24.5A13 13 0 0 1 30 16.5C30 26.3 18 39.6 17 41z" fill="${color}" stroke="#fff" stroke-width="2"/>
    <g transform="translate(5 4.5)">${GLYPHS[type]}</g>${ring}</svg></div>`;
}

export function legendSvg(type: LocationType): string {
  return `<svg width="18" height="22" viewBox="0 0 34 42" aria-hidden="true"><path d="M17 41c-1-1.4-13-14.7-13-24.5A13 13 0 0 1 30 16.5C30 26.3 18 39.6 17 41z" fill="${LOCATION_TYPE_COLORS[type]}"/><g transform="translate(5 4.5)">${GLYPHS[type]}</g></svg>`;
}
