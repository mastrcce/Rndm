import type { LocationType, RawMilkStatus } from "./categories";

/** Kompakte Darstellung für Karte und Ergebnisliste (wird an den Browser geschickt). */
export type MapPoint = {
  id: string;
  slug: string;
  name: string;
  gen: boolean; // Name generiert
  type: LocationType;
  lat: number;
  lon: number;
  addr: string | null;
  pc: string | null;
  city: string | null;
  state: string | null;
  oh: string | null; // opening_hours
  h24: boolean | null;
  raw: RawMilkStatus;
  org: "verified" | "claimed" | null;
  pay: string[];
  sales: string[];
  price: number | null;
  q: number; // Datenqualität
};

export type LocationSourceInfo = {
  source: string;
  sourceName: string;
  sourceId: string;
  sourceUrl: string | null;
  license: string | null;
  attribution: string | null;
  lastSeenAt: string;
  isStale: boolean;
};

export type LocationDetail = {
  id: string;
  slug: string;
  name: string;
  nameIsGenerated: boolean;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
  locationType: LocationType;
  salesTypes: string[];
  rawMilkStatus: RawMilkStatus;
  products: string[];
  description: string | null;
  notes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: string | null;
  is247: boolean | null;
  pricePerLiter: number | null;
  paymentMethods: string[];
  organicStatus: "verified" | "claimed" | null;
  organicLabel: string | null;
  imageUrl: string | null;
  source: string;
  sourceUrl: string | null;
  lastVerifiedAt: string | null;
  lastImportedAt: string | null;
  updatedAt: string;
  dataQualityScore: number;
  qualityFlags: string[];
  isActive: boolean;
  sources: LocationSourceInfo[];
};

export type Stats = {
  vending: number;
  total: number;
  farms: number;
  states: number;
  rawConfirmed: number;
  lastImport: string | null;
};

export type PlaceResult = {
  kind: "city" | "postal_code" | "state" | "address";
  label: string;
  slug?: string;
  lat: number;
  lon: number;
  bbox?: [number, number, number, number] | null;
  source: string;
};
