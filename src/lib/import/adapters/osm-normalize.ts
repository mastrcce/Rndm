import { CATEGORIES, type Category, type LocationType, type RawMilkStatus } from "../../categories";
import type { NormalizedLocation } from "../types";

export type OsmElement = {
  osmType: "node" | "way" | "relation";
  osmId: string | number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
};

const MILK_WORD = /(^|[^a-zäöü])(roh)?milch|(^|[;,\s_])(raw_)?milk([;,\s_]|$)/i;
const RAW_WORD = /rohmilch|vorzugsmilch|raw[_ ]milk|frischmilch ab hof|milch ab hof/i;

function splitList(v: string | undefined): string[] {
  if (!v) return [];
  return v
    .split(/[;,]/)
    .map((s) => s.trim().toLowerCase().replace(/\s+/g, "_"))
    .filter(Boolean);
}

function clean(v: string | undefined | null): string | null {
  if (v == null) return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Entfernt umschließende Anführungszeichen u. Ä. aus Namen ("Millymat" -> Millymat). */
export function cleanName(v: string | undefined | null): string | null {
  const c = clean(v);
  if (!c) return null;
  const stripped = c.replace(/^["„“”'‚‘]+|["„“”'‘’]+$/g, "").replace(/\s+/g, " ").trim();
  return stripped || null;
}

/** Prüft, ob ein OSM-Objekt einen Bezug zum Milchverkauf hat. Gibt den Grund zurück. */
export function milkEvidence(tags: Record<string, string>): string | null {
  const vending = splitList(tags.vending);
  if (vending.some((v) => v === "milk" || v === "raw_milk")) return "vending=milk";
  if (tags["vending:milk"] === "yes" || tags["vending:raw_milk"] === "yes") return "vending:milk";
  if (tags.milk && tags.milk !== "no") return "milk=*";
  for (const k of ["drink:raw_milk", "drink:milk", "food:milk", "sells:milk"]) {
    if (tags[k] && tags[k] !== "no") return k;
  }
  for (const k of ["product", "products", "produce"]) {
    if (splitList(tags[k]).some((v) => v === "milk" || v === "raw_milk" || v === "dairy")) return k;
  }
  if (MILK_WORD.test(tags.name ?? "")) return "name";
  if (MILK_WORD.test(tags.description ?? "") && (tags.amenity === "vending_machine" || tags.shop === "farm"))
    return "description";
  return null;
}

const ITEM_WORDS: Record<Exclude<Category, "milk">, string[]> = {
  eggs: ["egg", "eggs"],
  honey: ["honey"],
  meat: ["meat", "sausage", "sausages", "ham", "beef", "pork", "poultry", "game", "venison", "lamb", "chicken"],
  cheese: ["cheese"],
};

const NAME_WORDS: Record<Exclude<Category, "milk">, RegExp> = {
  eggs: /(^|[^a-zäöüß])(freiland|bio-?|frische[ -]?)?eier/i,
  honey: /honig|imker/i,
  meat: /fleisch|wurst|metzg|schlacht/i,
  cheese: /käse|kaese|sennerei/i,
};

/**
 * Ermittelt die Produktkategorien eines OSM-Objekts. Nur ausdrückliche Angaben zählen:
 * Automatensortiment (`vending`), Produktlisten (`products`, `produce`), `vending:<x>=yes`,
 * Imkerei (`craft=beekeeper`) oder ein eindeutiger Begriff im Namen.
 */
export function productCategories(tags: Record<string, string>): Category[] {
  const items = new Set([
    ...splitList(tags.vending),
    ...splitList(tags.product),
    ...splitList(tags.products),
    ...splitList(tags.produce),
  ]);
  const found = new Set<Category>();
  if (milkEvidence(tags) && tags.milk !== "no") found.add("milk");
  for (const cat of ["eggs", "honey", "meat", "cheese"] as const) {
    if (ITEM_WORDS[cat].some((w) => items.has(w))) found.add(cat);
    else if (ITEM_WORDS[cat].some((w) => tags[`vending:${w}`] === "yes")) found.add(cat);
    else if (NAME_WORDS[cat].test(tags.name ?? "")) found.add(cat);
  }
  if (tags.craft === "beekeeper") found.add("honey");
  return CATEGORIES.filter((c) => found.has(c));
}

export function rawMilkStatus(tags: Record<string, string>): RawMilkStatus {
  const text = `${tags.name ?? ""} ${tags.description ?? ""} ${tags.note ?? ""}`;
  if (tags.milk === "raw_milk" || tags.milk === "raw") return "confirmed";
  if (tags["drink:raw_milk"] && tags["drink:raw_milk"] !== "no") return "confirmed";
  if (tags["vending:raw_milk"] === "yes") return "confirmed";
  if (splitList(tags.vending).includes("raw_milk")) return "confirmed";
  if (RAW_WORD.test(text)) return "confirmed";
  if (tags.milk && /pasteuri|pasturi|uht|esl/i.test(tags.milk)) return "not_raw";
  if (tags["drink:raw_milk"] === "no") return "not_raw";
  return "unconfirmed";
}

export function classify(tags: Record<string, string>): { type: LocationType; salesTypes: string[] } {
  const vending = splitList(tags.vending);
  const hasMilk = !!milkEvidence(tags);
  const salesTypes = new Set<string>();
  if (tags.self_service === "yes" || tags.self_service === "only") salesTypes.add("selbstbedienung");

  if (tags.amenity === "vending_machine") {
    salesTypes.add("automat");
    // Milchautomat nur, wenn Milch im Spiel ist und das Sortiment im Wesentlichen aus Milch (ggf. Eiern) besteht
    const milkOnly = vending.length > 0 && vending.every((v) => ["milk", "raw_milk", "eggs", "egg"].includes(v));
    const named = MILK_WORD.test(tags.name ?? "") || /milchtankstelle|milch-tankstelle/i.test(tags.name ?? "");
    const type: LocationType = hasMilk && (milkOnly || named || vending.length === 0) ? "raw_milk_vending" : "vending_machine";
    return { type, salesTypes: [...salesTypes] };
  }
  if (tags.shop === "farm") {
    salesTypes.add("hofladen");
    salesTypes.add("direktverkauf");
    if (vending.length) salesTypes.add("automat");
    return { type: "farm_shop", salesTypes: [...salesTypes] };
  }
  if (tags.craft === "beekeeper") {
    salesTypes.add("direktverkauf");
    return { type: "beekeeper", salesTypes: [...salesTypes] };
  }
  if (tags.amenity === "marketplace") {
    salesTypes.add("markt");
    salesTypes.add("direktverkauf");
    return { type: "direct_sale", salesTypes: [...salesTypes] };
  }
  if (tags.place === "farm" || tags.landuse === "farmyard" || tags.building === "farm") {
    salesTypes.add("direktverkauf");
    return { type: "farm", salesTypes: [...salesTypes] };
  }
  salesTypes.add("direktverkauf");
  return { type: "direct_sale", salesTypes: [...salesTypes] };
}

function payments(tags: Record<string, string>): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(tags)) {
    if (!k.startsWith("payment:")) continue;
    if (v !== "yes" && v !== "only") continue;
    out.push(k.slice("payment:".length));
  }
  return out.sort();
}

function website(tags: Record<string, string>): string | null {
  const w = clean(tags.website ?? tags["contact:website"] ?? tags.url);
  if (!w) return null;
  if (/^https?:\/\//i.test(w)) return w;
  if (/^[\w.-]+\.[a-z]{2,}/i.test(w)) return `https://${w}`;
  return null;
}

function imageUrl(tags: Record<string, string>): string | null {
  const img = clean(tags.image);
  if (img && /^https:\/\//i.test(img) && /\.(jpe?g|png|webp)(\?|$)/i.test(img)) return img;
  const commons = clean(tags.wikimedia_commons) ?? (img && /^File:/i.test(img) ? img : null);
  if (commons && /^File:/i.test(commons)) {
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(commons.slice(5))}?width=800`;
  }
  return null;
}

/** Preis pro Liter, nur wenn eindeutig als Milchpreis angegeben (z. B. price:milk=1.50). */
function pricePerLiter(tags: Record<string, string>): number | null {
  const v = tags["price:milk"] ?? tags["price:raw_milk"] ?? tags["charge:milk"];
  if (!v) return null;
  const m = v.replace(",", ".").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return n > 0 && n < 20 ? n : null;
}

function checkDate(tags: Record<string, string>): string | null {
  const v = tags.check_date ?? tags["check_date:opening_hours"] ?? tags.survey_date ?? tags["survey:date"];
  if (!v) return null;
  const m = v.match(/^(\d{4})-(\d{2})(-(\d{2}))?$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[4] ?? "01"}`;
}

function organic(tags: Record<string, string>): { status: "claimed" | null; label: string | null } {
  const v = tags.organic ?? tags["diet:organic"];
  const label = clean(tags["organic:label"]);
  if (v === "only" || v === "yes" || label) return { status: "claimed", label };
  return { status: null, label: null };
}

function address(tags: Record<string, string>): string | null {
  const street = clean(tags["addr:street"]) ?? clean(tags["addr:place"]);
  const no = clean(tags["addr:housenumber"]);
  if (!street) return null;
  return no ? `${street} ${no}` : street;
}

export function normalizeOsm(el: OsmElement, state: string | null): NormalizedLocation {
  const t = el.tags;
  const { type, salesTypes } = classify(t);
  const products = [...new Set([...splitList(t.vending), ...splitList(t.products ?? t.product), ...splitList(t.produce)])]
    .filter((p) => p !== "animal_food");
  const raw = rawMilkStatus(t);
  // Ausdrücklich pasteurisierte Milch zählt nicht als Milch-Kategorie (Rohmilch-Verzeichnis)
  const categories = productCategories(t).filter((c) => !(c === "milk" && raw === "not_raw"));
  for (const [cat, word] of [["milk", "milk"], ["eggs", "eggs"], ["honey", "honey"], ["meat", "meat"], ["cheese", "cheese"]] as const) {
    if (categories.includes(cat) && !products.some((p) => p === word || (cat === "milk" && p === "raw_milk") || (cat === "eggs" && p === "egg"))) products.push(word);
  }

  const flags: string[] = [];
  const name = cleanName(t.name) ?? cleanName(t.brand);
  if (!name) flags.push("no_name");
  const addr = address(t);
  if (!addr) flags.push("no_address");
  if (!clean(t["addr:city"])) flags.push("no_city");
  if (!clean(t.opening_hours)) flags.push("no_opening_hours");
  if (t.fixme || t.FIXME) flags.push("osm_fixme");
  if (t.disused === "yes" || t["disused:amenity"] || t["disused:shop"]) flags.push("possibly_disused");

  const hours = clean(t.opening_hours);
  const org = organic(t);
  const id = `${el.osmType}/${el.osmId}`;

  return {
    source: "osm",
    sourceId: id,
    sourceUrl: `https://www.openstreetmap.org/${id}`,
    name,
    address: addr,
    postalCode: clean(t["addr:postcode"]),
    city: clean(t["addr:city"]) ?? clean(t["addr:village"]) ?? clean(t["addr:town"]),
    state,
    country: "DE",
    latitude: el.lat,
    longitude: el.lon,
    locationType: type,
    salesTypes,
    rawMilkStatus: raw,
    categories,
    products,
    description: clean(t.description) ?? clean(t["description:de"]),
    notes: clean(t["note:de"]) ?? clean(t.note),
    phone: clean(t.phone ?? t["contact:phone"] ?? t["contact:mobile"]),
    email: clean(t.email ?? t["contact:email"]),
    website: website(t),
    openingHours: hours,
    is247: hours ? /^24\/7$|^Mo-Su 00:00-24:00$|^Mo-Su,PH 00:00-(00|24):00$/.test(hours) : null,
    pricePerLiter: pricePerLiter(t),
    paymentMethods: payments(t),
    organicStatus: org.status,
    organicLabel: org.label,
    imageUrl: imageUrl(t),
    lastVerifiedAt: checkDate(t),
    qualityFlags: flags,
    operator: clean(t.operator),
  };
}
