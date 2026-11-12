import { describe, expect, it } from "vitest";
import { AUTO_MERGE_SCORE, REVIEW_SCORE, generatedName, matchScore, mergeSources, qualityScore } from "@/lib/import/merge";
import type { NormalizedLocation } from "@/lib/import/types";

const base: NormalizedLocation = {
  source: "osm", sourceId: "node/1", sourceUrl: null, name: null, address: null, postalCode: null, city: null, state: "Bayern",
  country: "DE", latitude: 48, longitude: 11, locationType: "raw_milk_vending", salesTypes: ["automat"], rawMilkStatus: "unconfirmed", categories: ["milk"],
  products: ["milk"], description: null, notes: null, phone: null, email: null, website: null, openingHours: null, is247: null,
  pricePerLiter: null, paymentMethods: [], organicStatus: null, organicLabel: null, imageUrl: null, lastVerifiedAt: null,
  qualityFlags: [], operator: null,
};
const cand = (o: Partial<{ name: string | null; address: string | null; postalCode: string | null; latitude: number; longitude: number; locationType: NormalizedLocation["locationType"] }>) => ({
  name: null, address: null, postalCode: null, latitude: 48, longitude: 11, locationType: "raw_milk_vending" as const, ...o,
});

describe("Dublettenerkennung", () => {
  it("führt gleiche Namen in kurzer Distanz automatisch zusammen", () => {
    const m = matchScore(cand({ name: "Milchtankstelle Huber" }), cand({ name: "Huber Milchtankstelle", latitude: 48.0002 }));
    expect(m.score).toBeGreaterThanOrEqual(AUTO_MERGE_SCORE);
  });
  it("erkennt gleiche Adresse unabhängig von Schreibweise", () => {
    const m = matchScore(
      cand({ address: "Hauptstraße 5", postalCode: "83022", latitude: 48.001 }),
      cand({ address: "Hauptstr. 5", postalCode: "83022" }),
    );
    expect(m.reasons).toContain("gleiche Adresse");
    expect(m.score).toBeGreaterThanOrEqual(AUTO_MERGE_SCORE);
  });
  it("hält verschiedene Betriebe in der Nähe auseinander", () => {
    const m = matchScore(cand({ name: "Hof Maier" }), cand({ name: "Biohof Schuster", latitude: 48.0003 }));
    expect(m.score).toBeLessThan(AUTO_MERGE_SCORE);
  });
  it("legt Hofladen + Automat am selben Hof zur Prüfung vor", () => {
    const m = matchScore(cand({ locationType: "farm_shop" }), cand({ latitude: 48.0001 }));
    expect(m.score).toBeGreaterThanOrEqual(REVIEW_SCORE);
    expect(m.score).toBeLessThan(AUTO_MERGE_SCORE);
  });
  it("ignoriert weit entfernte Standorte", () => {
    expect(matchScore(cand({ name: "A" }), cand({ name: "A", latitude: 48.01 })).score).toBe(0);
  });
});

describe("Zusammenführung", () => {
  it("bevorzugt Quellen mit höherer Priorität und füllt Lücken", () => {
    const osm = { ...base, name: "Milchhäusle", openingHours: "24/7", paymentMethods: ["coins"] };
    const manual = { ...base, source: "manual", sourceId: "m1", name: "Milchhäusle Familie Huber", phone: "+49 1", paymentMethods: ["notes"], rawMilkStatus: "confirmed" as const };
    const c = mergeSources([{ normalized: osm, priority: 30 }, { normalized: manual, priority: 0 }]);
    expect(c.name).toBe("Milchhäusle Familie Huber");
    expect(c.opening_hours).toBe("24/7");
    expect(c.phone).toBe("+49 1");
    expect(c.payment_methods).toEqual(["coins", "notes"]);
    expect(c.raw_milk_status).toBe("confirmed");
    expect(c.source).toBe("manual");
    expect(c.quality_flags).toContain("multi_source");
  });
  it("kennzeichnet generierte Namen", () => {
    const c = mergeSources([{ normalized: { ...base, nearbyPlace: "Dorfen" }, priority: 30 }]);
    expect(c.name).toBe("Milchautomat bei Dorfen");
    expect(c.name_is_generated).toBe(true);
    expect(generatedName({ ...base, city: "Erding" })).toBe("Milchautomat in Erding");
  });
  it("berechnet die Datenqualität", () => {
    const empty = mergeSources([{ normalized: base, priority: 30 }]);
    expect(empty.data_quality_score).toBe(0);
    const full = qualityScore({
      name_is_generated: false, address: "A 1", postal_code: "12345", city: "X", opening_hours: "24/7", phone: "1", website: null,
      raw_milk_status: "confirmed", payment_methods: ["coins"], price_per_liter: 1.2, image_url: "x", last_verified_at: new Date().toISOString(),
      quality_flags: [],
    });
    expect(full).toBe(100);
  });
});
