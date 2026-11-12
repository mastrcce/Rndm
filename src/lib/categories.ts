export const LOCATION_TYPES = [
  "raw_milk_vending",
  "vending_machine",
  "farm_shop",
  "farm",
  "direct_sale",
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const LOCATION_TYPE_LABELS: Record<LocationType, string> = {
  raw_milk_vending: "Milchautomat",
  vending_machine: "Verkaufsautomat",
  farm_shop: "Hofladen",
  farm: "Bauernhof",
  direct_sale: "Direktverkauf",
};

export const LOCATION_TYPE_PLURAL: Record<LocationType, string> = {
  raw_milk_vending: "Milchautomaten",
  vending_machine: "Verkaufsautomaten",
  farm_shop: "Hofläden",
  farm: "Bauernhöfe",
  direct_sale: "Direktverkauf",
};

export const LOCATION_TYPE_DESCRIPTIONS: Record<LocationType, string> = {
  raw_milk_vending: "Milchtankstelle oder Milchautomat, meist direkt am Hof",
  vending_machine: "Verkaufsautomat mit Milch im Sortiment",
  farm_shop: "Hofladen mit Milch im Angebot",
  farm: "Bauernhof mit Milch-Direktverkauf",
  direct_sale: "Sonstige Verkaufsstelle mit Milch",
};

/** Farben der Marker (passend zum Farbschema). */
export const LOCATION_TYPE_COLORS: Record<LocationType, string> = {
  raw_milk_vending: "#1f4d33",
  vending_machine: "#4f7a5a",
  farm_shop: "#9a6b2f",
  farm: "#7c8f4e",
  direct_sale: "#5b6b73",
};

export type RawMilkStatus = "confirmed" | "unconfirmed" | "not_raw";

export const RAW_MILK_LABELS: Record<RawMilkStatus, string> = {
  confirmed: "Rohmilch laut Quelle bestätigt",
  unconfirmed: "Milchverkauf – Rohmilch nicht ausdrücklich bestätigt",
  not_raw: "Keine Rohmilch laut Quelle",
};

export const PAYMENT_LABELS: Record<string, string> = {
  cash: "Bargeld",
  coins: "Münzen",
  notes: "Scheine",
  debit_cards: "EC-/Debitkarte",
  girocard: "girocard",
  credit_cards: "Kreditkarte",
  contactless: "Kontaktlos",
  paypal: "PayPal",
  app: "App",
  twint: "TWINT",
  electronic_purses: "Geldkarte",
  cryptocurrencies: "Kryptowährung",
  visa: "Visa",
  mastercard: "Mastercard",
  maestro: "Maestro",
  cards: "Karte",
  sumup: "SumUp",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
};

export function paymentLabel(key: string): string {
  return PAYMENT_LABELS[key] ?? key.replace(/_/g, " ");
}

export const PRODUCT_LABELS: Record<string, string> = {
  milk: "Milch",
  raw_milk: "Rohmilch",
  eggs: "Eier",
  egg: "Eier",
  cheese: "Käse",
  sausage: "Wurst",
  meat: "Fleisch",
  potatoes: "Kartoffeln",
  potato: "Kartoffeln",
  honey: "Honig",
  fruit: "Obst",
  vegetables: "Gemüse",
  noodles: "Nudeln",
  noodle: "Nudeln",
  yogurt: "Joghurt",
  yoghurt: "Joghurt",
  butter: "Butter",
  ice_cream: "Eis",
  food: "Lebensmittel",
  drinks: "Getränke",
  bread: "Brot",
  juice: "Saft",
  water: "Wasser",
};

export function productLabel(key: string): string {
  return PRODUCT_LABELS[key] ?? key.replace(/_/g, " ");
}

export const SALES_TYPE_LABELS: Record<string, string> = {
  automat: "Automat",
  hofladen: "Hofladen",
  direktverkauf: "Direktverkauf",
  selbstbedienung: "Selbstbedienung",
  markt: "Markt",
};
