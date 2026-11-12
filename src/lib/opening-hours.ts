import OpeningHours from "opening_hours";

type Ctx = { lat: number; lon: number; state: string | null };

const cache = new Map<string, OpeningHours | null>();

function parse(value: string, ctx: Ctx): OpeningHours | null {
  const key = `${value}|${ctx.state ?? ""}`;
  if (cache.has(key)) return cache.get(key)!;
  let oh: OpeningHours | null = null;
  try {
    oh = new OpeningHours(
      value,
      { lat: ctx.lat, lon: ctx.lon, address: { country_code: "de", state: ctx.state ?? "" } },
      { tag_key: "opening_hours", locale: "de" } as never,
    );
  } catch {
    oh = null;
  }
  cache.set(key, oh);
  return oh;
}

/**
 * Wertet die Öffnungszeiten-Angabe aus. `null` = nicht auswertbar/unbekannt.
 * Achtung: Das Ergebnis basiert nur auf der hinterlegten Angabe, nicht auf einer Prüfung vor Ort.
 */
export function isOpenAt(value: string | null, ctx: Ctx, date = new Date()): boolean | null {
  if (!value) return null;
  const oh = parse(value, ctx);
  if (!oh) return null;
  try {
    if (oh.getUnknown(date)) return null;
    return oh.getState(date);
  } catch {
    return null;
  }
}

export function nextChange(value: string | null, ctx: Ctx, date = new Date()): Date | null {
  if (!value) return null;
  const oh = parse(value, ctx);
  try {
    return oh?.getNextChange(date) ?? null;
  } catch {
    return null;
  }
}

const WEEKDAYS = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

/** Wochenübersicht (nächste 7 Tage ab Montag dieser Woche) aus der Öffnungszeiten-Angabe. */
export function weekTable(value: string | null, ctx: Ctx, now = new Date()): { day: string; text: string }[] | null {
  if (!value) return null;
  const oh = parse(value, ctx);
  if (!oh) return null;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const fmt = (d: Date) => d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  try {
    return WEEKDAYS.map((day, i) => {
      const from = new Date(monday);
      from.setDate(monday.getDate() + i);
      const to = new Date(from);
      to.setDate(from.getDate() + 1);
      const intervals = oh.getOpenIntervals(from, to);
      if (!intervals.length) return { day, text: "geschlossen" };
      const parts = intervals.map(([a, b, unknown, comment]) => {
        const full = a.getTime() === from.getTime() && b.getTime() === to.getTime();
        const t = full ? "durchgehend" : `${fmt(a)}–${b.getTime() === to.getTime() ? "24:00" : fmt(b)}`;
        return `${t}${unknown ? " (unsicher)" : ""}${comment ? ` – ${comment}` : ""}`;
      });
      return { day, text: parts.join(", ") };
    });
  } catch {
    return null;
  }
}
