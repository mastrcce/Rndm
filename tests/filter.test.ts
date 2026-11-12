import { describe, expect, it } from "vitest";
import { applyFilters, DEFAULT_FILTERS, inBounds, sortResults } from "@/lib/filter";
import type { MapPoint } from "@/lib/types";

const p = (o: Partial<MapPoint>): MapPoint => ({
  id: o.id ?? "x", slug: "s", name: "N", gen: false, type: "raw_milk_vending", lat: 48, lon: 11, addr: null, pc: null, city: null,
  state: "Bayern", oh: null, h24: null, raw: "unconfirmed", org: null, pay: [], sales: [], price: null, q: 10, ...o,
});

describe("Filter", () => {
  const pts = [
    p({ id: "a", lat: 48.0, lon: 11.0, h24: true, raw: "confirmed", pay: ["coins"] }),
    p({ id: "b", lat: 48.2, lon: 11.0, type: "farm_shop", pay: ["debit_cards"] }),
    p({ id: "c", lat: 49.0, lon: 11.0, org: "claimed" }),
  ];
  it("filtert nach Art, 24/7, Bio und Zahlung", () => {
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, types: ["farm_shop"] }, null).map((x) => x.id)).toEqual(["b"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, open247: true }, null).map((x) => x.id)).toEqual(["a"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, organic: true }, null).map((x) => x.id)).toEqual(["c"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, payments: ["card"] }, null).map((x) => x.id)).toEqual(["b"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, onlyRawConfirmed: true }, null).map((x) => x.id)).toEqual(["a"]);
  });
  it("Umkreissuche und Sortierung nach Entfernung", () => {
    const r = applyFilters(pts, { ...DEFAULT_FILTERS, radiusKm: 25 }, { lat: 48.0, lon: 11.0 });
    expect(r.map((x) => x.id)).toEqual(["a", "b"]);
    const sorted = sortResults(applyFilters(pts, DEFAULT_FILTERS, { lat: 49, lon: 11 }), "distance");
    expect(sorted.map((x) => x.id)).toEqual(["c", "b", "a"]);
  });
  it("„jetzt geöffnet“ blendet Standorte ohne Angabe aus", () => {
    const r = applyFilters(pts, { ...DEFAULT_FILTERS, openNow: true }, null, (x) => (x.id === "a" ? true : null));
    expect(r.map((x) => x.id)).toEqual(["a"]);
  });
  it("Kartenausschnitt", () => {
    expect(inBounds({ lat: 48, lon: 11 }, { south: 47, north: 49, west: 10, east: 12 })).toBe(true);
    expect(inBounds({ lat: 50, lon: 11 }, { south: 47, north: 49, west: 10, east: 12 })).toBe(false);
  });
});
