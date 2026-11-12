import { describe, expect, it } from "vitest";
import { fileToRecords, parseFileContent } from "@/lib/import/adapters/file";

describe("Datei-Import", () => {
  it("liest CSV mit deutschen Spaltennamen und Semikolon", () => {
    const csv = "name;strasse;plz;ort;lat;lon;typ;rohmilch;preis\nHof A;Weg 1;83022;Rosenheim;47.85;12.12;Milchtankstelle;ja;1,20\n";
    const rows = parseFileContent(csv, "x.csv");
    const res = fileToRecords(rows, "file", "test", () => {});
    expect(res.records).toHaveLength(1);
    const n = res.records[0].normalized;
    expect(n.locationType).toBe("raw_milk_vending");
    expect(n.rawMilkStatus).toBe("confirmed");
    expect(n.pricePerLiter).toBe(1.2);
    expect(n.state).toBe("Bayern");
    expect(res.complete).toBe(false);
  });
  it("überspringt Zeilen ohne Koordinaten oder außerhalb Deutschlands", () => {
    const rows = parseFileContent(JSON.stringify([{ name: "A" }, { name: "B", lat: 48.2, lon: 16.37 }]), "x.json");
    const res = fileToRecords(rows, "file", "test", () => {});
    expect(res.records).toHaveLength(0);
    expect(res.skipped).toEqual({ "keine gültigen Koordinaten": 1, "außerhalb Deutschlands": 1 });
  });
  it("akzeptiert GeoJSON", () => {
    const gj = { type: "FeatureCollection", features: [{ type: "Feature", properties: { name: "C" }, geometry: { type: "Point", coordinates: [9.18, 48.78] } }] };
    const res = fileToRecords(parseFileContent(JSON.stringify(gj), "x.geojson"), "file", "t", () => {});
    expect(res.records[0].normalized.state).toBe("Baden-Württemberg");
  });
});
