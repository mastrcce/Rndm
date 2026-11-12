import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

export function formatDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

export function formatPrice(v: number | null | undefined): string | null {
  if (v == null) return null;
  return `${v.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € / Liter`;
}

export function navigationLinks(lat: number, lon: number, label?: string) {
  const q = encodeURIComponent(label ?? `${lat},${lon}`);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
    apple: `https://maps.apple.com/?daddr=${lat},${lon}&q=${q}`,
    osm: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`,
  };
}
