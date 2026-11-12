import Link from "next/link";
import { notFound } from "next/navigation";
import { LocationForm } from "@/components/admin/location-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { query } from "@/lib/db";
import { getLocationById } from "@/lib/locations";
import { formatDate } from "@/lib/utils";
import { removeLocation, saveLocation, toggleActive, unlockLocation } from "../../../actions";

export const metadata = { title: "Standort bearbeiten" };

export default async function EditLocationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  const l = await getLocationById(id);
  if (!l) notFound();
  const [extra] = await query<{ locked_fields: string[] }>("select locked_fields from locations where id = $1", [id]);
  const changes = await query<{ id: number; changed_at: Date; change_source: string; diff: Record<string, { from: unknown; to: unknown }> }>(
    "select id, changed_at, change_source, diff from location_changes where location_id = $1 order by changed_at desc limit 30",
    [id],
  );
  const raw = await query<{ source: string; source_id: string; raw: unknown; is_stale: boolean }>(
    "select source, source_id, raw, is_stale from location_sources where location_id = $1",
    [id],
  );
  const save = saveLocation.bind(null, id);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-medium">{l.name}</h1>
          <p className="mt-1 text-sm text-muted">
            <Link href={`/standort/${l.slug}`} className="underline" target="_blank">/standort/{l.slug}</Link> · Qualität {l.dataQualityScore}/100
            {!l.isActive && <Badge variant="warn" className="ml-2">inaktiv</Badge>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form action={toggleActive.bind(null, id, !l.isActive)}><Button variant="secondary" size="sm">{l.isActive ? "Deaktivieren" : "Aktivieren"}</Button></form>
          {extra.locked_fields.length > 0 && (
            <form action={unlockLocation.bind(null, id)}><Button variant="ghost" size="sm" title="Wieder vollständig aus den Quellen übernehmen">Sperren aufheben ({extra.locked_fields.length})</Button></form>
          )}
          <form action={removeLocation.bind(null, id)}><Button variant="danger" size="sm">Löschen</Button></form>
        </div>
      </div>
      {sp.gespeichert && <p className="rounded-2xl bg-sage-100 px-4 py-2 text-sm">Änderungen gespeichert.</p>}
      {sp.angelegt && <p className="rounded-2xl bg-sage-100 px-4 py-2 text-sm">Standort angelegt.</p>}
      {extra.locked_fields.length > 0 && <p className="text-xs text-muted">Redaktionell gesperrte Felder: {extra.locked_fields.join(", ")}</p>}
      <LocationForm action={save} location={l} submitLabel="Speichern" />

      <Card className="p-5">
        <h2 className="text-lg font-medium">Quellen</h2>
        <ul className="mt-3 space-y-3 text-sm">
          {raw.map((r) => (
            <li key={`${r.source}${r.source_id}`}>
              <p className="font-medium">{r.source} · {r.source_id} {r.is_stale && <Badge variant="warn">veraltet</Badge>}</p>
              <details><summary className="cursor-pointer text-xs text-muted">Rohdaten anzeigen</summary>
                <pre className="mt-2 max-h-64 overflow-auto rounded-2xl bg-cream-50 p-3 text-xs">{JSON.stringify(r.raw, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-medium">Änderungsprotokoll</h2>
        {changes.length === 0 ? <p className="mt-2 text-sm text-muted">Keine Änderungen.</p> : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {changes.map((c) => (
              <li key={c.id} className="py-2">
                <p className="text-xs text-muted">{formatDate(c.changed_at)} {c.changed_at.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })} · {c.change_source}</p>
                <ul className="mt-1 space-y-0.5">
                  {Object.entries(c.diff).map(([k, v]) => (
                    <li key={k} className="break-all"><code className="text-xs">{k}</code>: {typeof v === "object" && v && "to" in v ? <><span className="text-muted line-through">{JSON.stringify(v.from)}</span> → {JSON.stringify(v.to)}</> : JSON.stringify(v)}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
