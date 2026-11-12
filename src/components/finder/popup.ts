import { CATEGORY_LABELS, LOCATION_TYPE_LABELS, RAW_MILK_LABELS } from "@/lib/categories";
import { formatDistance } from "@/lib/geo";
import type { ResultPoint } from "@/lib/filter";
import { navigationLinks } from "@/lib/utils";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function popupHtml(p: ResultPoint): string {
  const nav = navigationLinks(p.lat, p.lon, p.name);
  const addrLine = [p.addr, [p.pc, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const raw = !p.cat.includes("milk")
    ? ""
    : p.raw === "confirmed"
    ? `<span style="color:#1f4d33;font-weight:600">✓ ${esc(RAW_MILK_LABELS.confirmed)}</span>`
    : `<span style="color:#5c6a61">${esc(RAW_MILK_LABELS[p.raw])}</span>`;
  return `
  <div style="min-width:220px;max-width:260px">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6a8456;font-weight:600">${esc(LOCATION_TYPE_LABELS[p.type])}${p.distance != null ? ` · ${formatDistance(p.distance)}` : ""}</div>
    <div style="font-family:var(--font-display);font-size:17px;font-weight:600;color:#173424;margin:2px 0 6px">${esc(p.name)}</div>
    <div style="color:#1c2420">${addrLine ? esc(addrLine) : '<span style="color:#5c6a61">Adresse: Keine Angabe</span>'}</div>
    <div style="margin-top:4px;color:#1c2420">${p.oh ? `<b>Öffnungszeiten:</b> ${esc(p.oh === "24/7" ? "24/7 (laut Angabe)" : p.oh)}` : '<span style="color:#5c6a61">Öffnungszeiten: Keine Angabe</span>'}</div>
    <div style="margin-top:6px;font-size:12px;color:#1c2420"><b>Angebot:</b> ${esc(p.cat.map((c) => CATEGORY_LABELS[c]).join(", "))}</div>
    ${raw ? `<div style="margin-top:4px;font-size:12px">${raw}</div>` : ""}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
      <a href="/standort/${encodeURIComponent(p.slug)}" style="background:#1f4d33;color:#fdfbf6;padding:6px 12px;border-radius:999px;text-decoration:none;font-weight:500">Details</a>
      <a href="${nav.google}" target="_blank" rel="noopener noreferrer" style="border:1px solid #e4dfd2;color:#173424;padding:6px 10px;border-radius:999px;text-decoration:none">Google Maps</a>
      <a href="${nav.apple}" target="_blank" rel="noopener noreferrer" style="border:1px solid #e4dfd2;color:#173424;padding:6px 10px;border-radius:999px;text-decoration:none">Apple Karten</a>
    </div>
  </div>`;
}
