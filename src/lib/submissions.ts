import { z } from "zod";
import { LOCATION_TYPES } from "./categories";

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().transform((v) => (v ? v : undefined));

export const locationFieldsSchema = z.object({
  name: optionalText(160),
  address: optionalText(200),
  postal_code: z.string().trim().regex(/^\d{5}$/, "PLZ muss 5 Ziffern haben").optional().or(z.literal("").transform(() => undefined)),
  city: optionalText(120),
  location_type: z.enum(LOCATION_TYPES).optional(),
  latitude: z.coerce.number().min(47).max(55.2).optional(),
  longitude: z.coerce.number().min(5.8).max(15.1).optional(),
  phone: optionalText(60),
  website: optionalText(300),
  opening_hours: optionalText(300),
  price_per_liter: z.coerce.number().min(0).max(20).optional(),
  payment_methods: optionalText(200),
  description: optionalText(2000),
  raw_milk: z.enum(["ja", "nein", "unbekannt"]).optional(),
});

export const submissionSchema = z.object({
  kind: z.enum(["report", "suggestion", "addition"]),
  location_id: z.string().uuid().optional(),
  message: optionalText(3000),
  contact_email: z.string().trim().email("Ungültige E-Mail-Adresse").max(200).optional().or(z.literal("").transform(() => undefined)),
  fields: locationFieldsSchema.prefault({}),
  report_reason: z.enum(["closed", "wrong_location", "wrong_info", "no_raw_milk", "other"]).optional(),
  consent: z.literal(true, { message: "Bitte stimme der Verarbeitung zu." }),
  // Honeypot – muss leer bleiben
  website_confirm: z.string().max(0).optional(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const REPORT_REASONS: Record<string, string> = {
  closed: "Standort existiert nicht mehr / dauerhaft geschlossen",
  wrong_location: "Position auf der Karte falsch",
  wrong_info: "Angaben (Öffnungszeiten, Kontakt …) falsch",
  no_raw_milk: "Hier gibt es keine Rohmilch",
  other: "Sonstiges",
};
