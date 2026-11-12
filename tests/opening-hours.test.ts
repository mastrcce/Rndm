import { describe, expect, it } from "vitest";
import { isOpenAt, weekTable } from "@/lib/opening-hours";

const ctx = { lat: 48.1, lon: 11.5, state: "Bayern" };

describe("Öffnungszeiten", () => {
  it("wertet OSM-Angaben aus", () => {
    const wed10 = new Date("2026-11-11T10:00:00");
    const wed23 = new Date("2026-11-11T23:00:00");
    expect(isOpenAt("Mo-Su 06:00-22:00", ctx, wed10)).toBe(true);
    expect(isOpenAt("Mo-Su 06:00-22:00", ctx, wed23)).toBe(false);
    expect(isOpenAt("24/7", ctx, wed23)).toBe(true);
  });
  it("liefert null bei fehlender oder ungültiger Angabe", () => {
    expect(isOpenAt(null, ctx)).toBeNull();
    expect(isOpenAt("täglich frisch", ctx)).toBeNull();
  });
  it("erzeugt eine Wochentabelle", () => {
    const t = weekTable("Mo-Fr 08:00-18:00", ctx, new Date("2026-11-11T10:00:00"));
    expect(t?.[0]).toEqual({ day: "Montag", text: "08:00–18:00" });
    expect(t?.[6]).toEqual({ day: "Sonntag", text: "geschlossen" });
  });
});
