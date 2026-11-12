import { describe, expect, it } from "vitest";
import { classify, cleanName, milkEvidence, normalizeOsm, rawMilkStatus } from "@/lib/import/adapters/osm-normalize";
import { osmToRecords } from "@/lib/import/adapters/osm";

describe("OSM-Normalisierung", () => {
  it("erkennt Milchbezug nur bei passenden Tags", () => {
    expect(milkEvidence({ amenity: "vending_machine", vending: "milk;eggs" })).toBe("vending=milk");
    expect(milkEvidence({ shop: "farm", milk: "raw_milk" })).toBe("milk=*");
    expect(milkEvidence({ amenity: "vending_machine", vending: "eggs" })).toBeNull();
    expect(milkEvidence({ shop: "farm", name: "Hofladen Huber" })).toBeNull();
    expect(milkEvidence({ amenity: "vending_machine", name: "Milchhäusle" })).toBe("name");
    expect(milkEvidence({ amenity: "vending_machine", vending: "milk_shakes" })).toBeNull();
  });

  it("bestätigt Rohmilch nur bei ausdrücklicher Angabe", () => {
    expect(rawMilkStatus({ vending: "milk" })).toBe("unconfirmed");
    expect(rawMilkStatus({ milk: "raw_milk" })).toBe("confirmed");
    expect(rawMilkStatus({ "drink:raw_milk": "yes" })).toBe("confirmed");
    expect(rawMilkStatus({ vending: "milk", description: "Frische Rohmilch vom Hof" })).toBe("confirmed");
    expect(rawMilkStatus({ milk: "pasturised" })).toBe("not_raw");
  });

  it("klassifiziert Automaten und Hofläden", () => {
    expect(classify({ amenity: "vending_machine", vending: "milk" }).type).toBe("raw_milk_vending");
    expect(classify({ amenity: "vending_machine", vending: "food;drinks;milk" }).type).toBe("vending_machine");
    expect(classify({ amenity: "vending_machine", vending: "food;milk", name: "Milchtankstelle Huber" }).type).toBe("raw_milk_vending");
    const farm = classify({ shop: "farm", vending: "milk" });
    expect(farm.type).toBe("farm_shop");
    expect(farm.salesTypes).toContain("automat");
  });

  it("erfindet keine Angaben", () => {
    const n = normalizeOsm({ osmType: "node", osmId: 1, lat: 48, lon: 11, tags: { amenity: "vending_machine", vending: "milk" } }, "Bayern");
    expect(n.name).toBeNull();
    expect(n.address).toBeNull();
    expect(n.city).toBeNull();
    expect(n.openingHours).toBeNull();
    expect(n.is247).toBeNull();
    expect(n.pricePerLiter).toBeNull();
    expect(n.phone).toBeNull();
    expect(n.qualityFlags).toEqual(expect.arrayContaining(["no_name", "no_address", "no_opening_hours"]));
    expect(n.sourceUrl).toBe("https://www.openstreetmap.org/node/1");
  });

  it("übernimmt Adresse, Zahlung, Prüfdatum und 24/7", () => {
    const n = normalizeOsm({
      osmType: "way", osmId: 5, lat: 48, lon: 11,
      tags: {
        amenity: "vending_machine", vending: "milk", name: '"Millymat"', "addr:street": "Dorfstraße", "addr:housenumber": "3",
        "addr:postcode": "83022", "addr:city": "Rosenheim", opening_hours: "24/7", "payment:coins": "yes", "payment:notes": "yes",
        "payment:cards": "no", check_date: "2025-07", website: "hof.example", "price:milk": "1,50",
      },
    }, "Bayern");
    expect(n.name).toBe("Millymat");
    expect(n.address).toBe("Dorfstraße 3");
    expect(n.is247).toBe(true);
    expect(n.paymentMethods).toEqual(["coins", "notes"]);
    expect(n.lastVerifiedAt).toBe("2025-07-01");
    expect(n.website).toBe("https://hof.example");
    expect(n.pricePerLiter).toBe(1.5);
  });

  it("entfernt Anführungszeichen aus Namen", () => {
    expect(cleanName("„Milchhäusle“")).toBe("Milchhäusle");
    expect(cleanName("  ")).toBeNull();
  });

  it("filtert auf Deutschland", () => {
    const res = osmToRecords([
      { osmType: "node", osmId: 1, lat: 48.137, lon: 11.575, tags: { amenity: "vending_machine", vending: "milk" } }, // München
      { osmType: "node", osmId: 2, lat: 48.208, lon: 16.373, tags: { amenity: "vending_machine", vending: "milk" } }, // Wien
      { osmType: "node", osmId: 3, lat: 47.37, lon: 8.54, tags: { amenity: "vending_machine", vending: "milk" } }, // Zürich
      { osmType: "node", osmId: 4, lat: 52.52, lon: 13.40, tags: { amenity: "vending_machine", vending: "eggs" } }, // keine Milch
    ], "test", () => {});
    expect(res.records.map((r) => r.normalized.sourceId)).toEqual(["node/1"]);
    expect(res.records[0].normalized.state).toBe("Bayern");
  });
});
