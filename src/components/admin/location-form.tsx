import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LOCATION_TYPE_LABELS, LOCATION_TYPES } from "@/lib/categories";
import type { LocationDetail } from "@/lib/types";

/** Formular für Anlage/Bearbeitung (Server-Komponente, nutzt Server Action). */
export function LocationForm({ action, location, submitLabel }: { action: (form: FormData) => Promise<void>; location?: LocationDetail; submitLabel: string }) {
  const l = location;
  const text = (name: string, label: string, value?: string | number | null, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={value ?? ""} {...props} />
    </div>
  );
  return (
    <form action={action} className="grid gap-4 rounded-xl2 border border-line bg-white p-5 sm:grid-cols-2">
      <div className="sm:col-span-2">{text("name", "Name", l && !l.nameIsGenerated ? l.name : "", { required: !l })}</div>
      <div>
        <Label htmlFor="location_type">Art</Label>
        <Select id="location_type" name="location_type" defaultValue={l?.locationType ?? "raw_milk_vending"}>
          {LOCATION_TYPES.map((t) => <option key={t} value={t}>{LOCATION_TYPE_LABELS[t]}</option>)}
        </Select>
      </div>
      <div>
        <Label htmlFor="raw_milk_status">Rohmilch</Label>
        <Select id="raw_milk_status" name="raw_milk_status" defaultValue={l?.rawMilkStatus ?? "unconfirmed"}>
          <option value="confirmed">bestätigt</option>
          <option value="unconfirmed">nicht bestätigt</option>
          <option value="not_raw">keine Rohmilch</option>
        </Select>
      </div>
      {text("address", "Straße + Nr.", l?.address)}
      <div className="grid grid-cols-[110px_1fr] gap-2">
        {text("postal_code", "PLZ", l?.postalCode, { pattern: "\\d{5}" })}
        {text("city", "Ort", l?.city)}
      </div>
      {text("latitude", "Breitengrad", l?.latitude, { required: true, inputMode: "decimal" })}
      {text("longitude", "Längengrad", l?.longitude, { required: true, inputMode: "decimal" })}
      {text("phone", "Telefon", l?.phone)}
      {text("email", "E-Mail", l?.email, { type: "email" })}
      {text("website", "Website", l?.website)}
      {text("image_url", "Bild-URL", l?.imageUrl)}
      <div className="sm:col-span-2">{text("opening_hours", "Öffnungszeiten (OSM-Syntax, z. B. Mo-Su 06:00-22:00 oder 24/7 – „24/7“-Kennzeichen wird daraus abgeleitet)", l?.openingHours)}</div>
      {text("price_per_liter", "Preis pro Liter (€)", l?.pricePerLiter, { inputMode: "decimal" })}
      {text("payment_methods", "Zahlungsarten (OSM-Schlüssel, kommagetrennt: coins, notes, cash, debit_cards …)", l?.paymentMethods.join(", "))}
      <div>
        <Label htmlFor="organic_status">Bio</Label>
        <Select id="organic_status" name="organic_status" defaultValue={l?.organicStatus ?? ""}>
          <option value="">keine Angabe</option><option value="claimed">laut Quelle</option><option value="verified">verifiziert (Zertifikat geprüft)</option>
        </Select>
      </div>
      {text("organic_label", "Bio-Verband", l?.organicLabel)}
      {text("last_verified_at", "Zuletzt geprüft am", l?.lastVerifiedAt?.slice(0, 10), { type: "date" })}
      <div className="sm:col-span-2">
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea id="description" name="description" defaultValue={l?.description ?? ""} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="notes">Besondere Hinweise</Label>
        <Textarea id="notes" name="notes" defaultValue={l?.notes ?? ""} />
      </div>
      <div className="sm:col-span-2 flex items-center justify-between gap-3">
        <p className="text-xs text-muted">Geänderte Felder werden gesperrt und bei künftigen Importen nicht überschrieben.</p>
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
