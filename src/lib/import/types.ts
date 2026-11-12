import type { LocationType, RawMilkStatus } from "../categories";

/**
 * Gemeinsames Datenformat, in das jede Quelle überführt wird.
 * Fehlende Angaben sind immer `null` bzw. leere Listen – es wird nichts ergänzt,
 * was die Quelle nicht hergibt (Ausnahme: Bundesland, das aus den Koordinaten abgeleitet wird).
 */
export type NormalizedLocation = {
  source: string;
  sourceId: string;
  sourceUrl: string | null;
  name: string | null;
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
  lastVerifiedAt: string | null; // ISO-Datum
  qualityFlags: string[];
  operator: string | null;
  /** Nächstgelegener Ort – nur zur Benennung namenloser Standorte („bei …“), nie als Adresse. */
  nearbyPlace?: string | null;
};

export type SourceRecord = {
  normalized: NormalizedLocation;
  raw: unknown;
};

export type AdapterResult = {
  records: SourceRecord[];
  /** Anzahl der Rohdatensätze vor dem Filtern. */
  scanned: number;
  /** Datensätze, die bewusst übersprungen wurden, mit Grund. */
  skipped: Record<string, number>;
  /** Kennzeichnet, ob der Abzug vollständig ist (nur dann dürfen fehlende Einträge deaktiviert werden). */
  complete: boolean;
  mode: string;
};

export type ImportLogger = (line: string) => void;
