"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useState } from "react";
import { MiniMapClient } from "@/components/location/mini-map-client";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { LOCATION_TYPE_LABELS, LOCATION_TYPES } from "@/lib/categories";
import { REPORT_REASONS } from "@/lib/submissions";

type Kind = "report" | "suggestion" | "addition";

type Props = {
  kind: Kind;
  locationId?: string;
  locationName?: string;
  initialPosition?: { lat: number; lon: number };
};

const FIELD_LABELS: { key: string; label: string; placeholder?: string; type?: string }[] = [
  { key: "name", label: "Name des Betriebs" },
  { key: "address", label: "Straße und Hausnummer" },
  { key: "postal_code", label: "PLZ", placeholder: "z. B. 83022" },
  { key: "city", label: "Ort" },
  { key: "phone", label: "Telefon" },
  { key: "website", label: "Website", placeholder: "https://…" },
  { key: "opening_hours", label: "Öffnungszeiten", placeholder: "z. B. täglich 6–22 Uhr" },
  { key: "price_per_liter", label: "Preis pro Liter (€)", placeholder: "z. B. 1,50", type: "text" },
  { key: "payment_methods", label: "Zahlungsarten", placeholder: "z. B. Münzen, Scheine, EC-Karte" },
];

export function SubmissionForm({ kind, locationId, locationName, initialPosition }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("wrong_info");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(kind === "suggestion" ? null : initialPosition ?? null);
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!v.trim()) continue;
      fields[k] = k === "price_per_liter" ? v.replace(",", ".") : v;
    }
    if (kind === "suggestion" && pos) {
      fields.latitude = pos.lat;
      fields.longitude = pos.lon;
    }
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          location_id: locationId,
          message: message || undefined,
          contact_email: email || undefined,
          fields,
          report_reason: kind === "report" ? reason : undefined,
          consent,
          website_confirm: honeypot || undefined,
        }),
      });
      const j = (await res.json()) as { ok: boolean; error?: string };
      if (!j.ok) throw new Error(j.error ?? "Fehler beim Senden");
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError((err as Error).message);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-xl2 border border-line bg-white p-8 text-center shadow-soft">
        <CheckCircle2 className="mx-auto size-10 text-sage-600" aria-hidden />
        <h2 className="mt-3 text-2xl font-semibold">Vielen Dank!</h2>
        <p className="mt-2 text-muted">
          Dein Beitrag ist eingegangen und wird vor der Veröffentlichung von uns geprüft.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl2 border border-line bg-white p-5 shadow-soft sm:p-8">
      {locationName && (
        <p className="rounded-xl bg-cream-50 px-4 py-3 text-sm">
          Standort: <strong className="text-forest-900">{locationName}</strong>
        </p>
      )}

      {kind === "report" && (
        <div>
          <Label htmlFor="reason">Was stimmt nicht?</Label>
          <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
            {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      )}

      {kind === "suggestion" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="type">Art des Standorts</Label>
            <Select id="type" value={values.location_type ?? ""} onChange={(e) => set("location_type", e.target.value)} required>
              <option value="" disabled>Bitte wählen</option>
              {LOCATION_TYPES.map((t) => <option key={t} value={t}>{LOCATION_TYPE_LABELS[t]}</option>)}
            </Select>
          </div>
          <div>
            <Label htmlFor="raw">Gibt es dort Rohmilch?</Label>
            <Select id="raw" value={values.raw_milk ?? "unbekannt"} onChange={(e) => set("raw_milk", e.target.value)}>
              <option value="ja">Ja, ausdrücklich Rohmilch</option>
              <option value="unbekannt">Weiß ich nicht genau</option>
            </Select>
          </div>
        </div>
      )}

      {(kind === "suggestion" || kind === "addition") && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm text-muted sm:col-span-2">
            {kind === "addition" ? "Fülle nur die Felder aus, die du ergänzen oder korrigieren möchtest." : "Je mehr du angibst, desto schneller können wir den Standort prüfen."}
          </legend>
          {FIELD_LABELS.map((f) => (
            <div key={f.key} className={f.key === "name" || f.key === "opening_hours" ? "sm:col-span-2" : undefined}>
              <Label htmlFor={f.key}>{f.label}</Label>
              <Input id={f.key} type={f.type ?? "text"} placeholder={f.placeholder} value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}
                required={kind === "suggestion" && f.key === "name"} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <Label htmlFor="description">Beschreibung</Label>
            <Textarea id="description" value={values.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>
        </fieldset>
      )}

      {kind === "suggestion" && (
        <div>
          <Label>Position auf der Karte</Label>
          <p className="mb-2 text-sm text-muted">Klicke in die Karte oder ziehe den Marker an die richtige Stelle (optional, wenn die Adresse angegeben ist).</p>
          <div className="overflow-hidden rounded-xl border border-line">
            <MiniMapClient
              lat={pos?.lat ?? 51.1}
              lon={pos?.lon ?? 10.4}
              type={(values.location_type as never) || "raw_milk_vending"}
              confirmed={false}
              draggable
              hideMarker={!pos}
              zoom={pos ? 13 : 6}
              onMove={(lat, lon) => setPos({ lat, lon })}
              className="h-72 w-full"
            />
          </div>
          <p className="mt-1 text-xs text-muted">
            {pos ? `Gewählt: ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)}` : "Noch keine Position gewählt."}
          </p>
        </div>
      )}

      <div>
        <Label htmlFor="message">{kind === "report" ? "Beschreibung des Fehlers" : "Weitere Hinweise"}</Label>
        <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required={kind === "report"}
          placeholder={kind === "report" ? "Was ist falsch, und was ist richtig?" : "Woher stammen deine Informationen? (z. B. selbst vor Ort gewesen)"} />
      </div>

      <div>
        <Label htmlFor="email">E-Mail für Rückfragen (optional)</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" />
      </div>

      {/* Honeypot gegen Spam-Bots */}
      <div className="hidden" aria-hidden>
        <label>Website bestätigen<input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} /></label>
      </div>

      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} required className="mt-1 size-4 accent-forest-800" />
        <span className="text-muted">
          Ich bin einverstanden, dass meine Angaben zur Prüfung und Pflege des Verzeichnisses gespeichert werden.
          Die E-Mail-Adresse wird nur für Rückfragen genutzt und nicht veröffentlicht. Siehe <a href="/datenschutz" className="underline">Datenschutz</a>.
        </span>
      </label>

      {error && <p className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn-fg" role="alert">{error}</p>}

      <Button type="submit" size="lg" disabled={status === "sending" || !consent}>
        {status === "sending" && <Loader2 className="animate-spin" />} Absenden
      </Button>
    </form>
  );
}
