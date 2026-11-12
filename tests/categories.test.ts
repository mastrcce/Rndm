import { describe, expect, it } from "vitest";
import { classify, normalizeOsm, productCategories } from "@/lib/import/adapters/osm-normalize";
import { parseCategories } from "@/lib/import/adapters/file";
import { generatedName } from "@/lib/import/merge";
import { applyFilters, DEFAULT_FILTERS } from "@/lib/filter";
import type { MapPoint } from "@/lib/types";

describe("Produktkategorien aus OSM", () => {
  it("erkennt Produkte aus Automatensortiment, Produktlisten und Imkerei", () => {
    expect(productCategories({ amenity: "vending_machine", vending: "eggs;milk" })).toEqual(["milk", "eggs"]);
    expect(productCategories({ amenity: "vending_machine", vending: "sausages;meat;cheese" })).toEqual(["meat", "cheese"]);
    expect(productCategories({ craft: "beekeeper" })).toEqual(["honey"]);
    expect(productCategories({ shop: "farm", products: "potatoes;vegetables" })).toEqual([]);
    expect(productCategories({ shop: "farm", "vending:eggs": "yes" })).toEqual(["eggs"]);
  });
  it("nutzt Namen nur bei eindeutigen Begriffen", () => {
    expect(productCategories({ amenity: "vending_machine", name: "Eierautomat Huber" })).toEqual(["eggs"]);
    expect(productCategories({ shop: "farm", name: "Freilandeier Schmid" })).toEqual(["eggs"]);
    expect(productCategories({ shop: "farm", name: "Hof Meier" })).toEqual([]); // „Meier“ ist kein Ei
    expect(productCategories({ shop: "farm", name: "Hofkäserei Alpenblick" })).toEqual(["cheese"]);
  });
  it("klassifiziert Eierautomaten nicht als Milchautomat", () => {
    expect(classify({ amenity: "vending_machine", vending: "eggs" }).type).toBe("vending_machine");
    expect(classify({ amenity: "vending_machine", vending: "milk;eggs" }).type).toBe("raw_milk_vending");
    expect(classify({ craft: "beekeeper" }).type).toBe("beekeeper");
  });
  it("entfernt pasteurisierte Milch aus den Kategorien, behält andere Produkte", () => {
    const n = normalizeOsm({ osmType: "node", osmId: 9, lat: 48, lon: 11, tags: { amenity: "vending_machine", vending: "milk;eggs", milk: "pasteurised" } }, "Bayern");
    expect(n.categories).toEqual(["eggs"]);
  });
  it("benennt namenlose Automaten nach dem Sortiment", () => {
    expect(generatedName({ locationType: "vending_machine", categories: ["eggs"], city: null, operator: null, state: "Bayern", nearbyPlace: "Dorfen" })).toBe("Eierautomat bei Dorfen");
    expect(generatedName({ locationType: "beekeeper", categories: ["honey"], city: "Erding", operator: null, state: "Bayern" })).toBe("Imkerei in Erding");
  });
});

describe("Datei-Import: Kategorien", () => {
  it("liest deutsche und englische Bezeichnungen", () => {
    expect(parseCategories("Milch|Eier, Honig")).toEqual(["milk", "eggs", "honey"]);
    expect(parseCategories("Käse")).toEqual(["cheese"]);
    expect(parseCategories(null)).toEqual(["milk"]);
    expect(parseCategories("Kartoffeln")).toEqual([]);
  });
});

describe("Filter nach Produkt", () => {
  const p = (id: string, cat: MapPoint["cat"]): MapPoint => ({
    id, slug: id, name: id, gen: false, type: "vending_machine", lat: 48, lon: 11, addr: null, pc: null, city: null, state: null,
    oh: null, h24: null, raw: "unconfirmed", cat, org: null, pay: [], sales: [], price: null, q: 0,
  });
  const pts = [p("a", ["milk"]), p("b", ["eggs"]), p("c", ["milk", "honey"])];
  it("zeigt standardmäßig Milch, sonst die gewählten Produkte", () => {
    expect(applyFilters(pts, DEFAULT_FILTERS, null).map((x) => x.id)).toEqual(["a", "c"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, categories: ["eggs", "honey"] }, null).map((x) => x.id)).toEqual(["b", "c"]);
    expect(applyFilters(pts, { ...DEFAULT_FILTERS, categories: [] }, null)).toHaveLength(3);
  });
});
