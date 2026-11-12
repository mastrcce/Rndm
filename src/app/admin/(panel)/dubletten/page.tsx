import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LOCATION_TYPE_LABELS, type LocationType } from "@/lib/categories";
import { query } from "@/lib/db";
import { resolveDuplicate, runDuplicateScan } from "../../actions";

export const metadata = { title: "Dubletten" };

type Side = { id: string; name: string; slug: string; address: string | null; city: string | null; location_type: LocationType; data_quality_score: number; sources: string[] };

export default async function DuplicatesPage() {
  const rows = await query<{ id: number; score: number; distance_m: number; reasons: string[]; a: Side; b: Side }>(
    `select c.id, c.score, c.distance_m, c.reasons,
       (select json_build_object('id', l.id, 'name', l.name, 'slug', l.slug, 'address', l.address, 'city', l.city, 'location_type', l.location_type,
          'data_quality_score', l.data_quality_score, 'sources', (select json_agg(s.source || ':' || s.source_id) from location_sources s where s.location_id = l.id))
          from locations l where l.id = c.location_a) as a,
       (select json_build_object('id', l.id, 'name', l.name, 'slug', l.slug, 'address', l.address, 'city', l.city, 'location_type', l.location_type,
          'data_quality_score', l.data_quality_score, 'sources', (select json_agg(s.source || ':' || s.source_id) from location_sources s where s.location_id = l.id))
          from locations l where l.id = c.location_b) as b
     from duplicate_candidates c where c.status = 'open' order by c.score desc, c.distance_m limit 100`,
  );
  const side = (s: Side) => (
    <div className="min-w-0 rounded-2xl bg-cream-50 p-3 text-sm">
      <Link href={`/admin/standorte/${s.id}`} className="font-medium text-forest-900 hover:underline">{s.name}</Link>
      <p className="text-muted">{LOCATION_TYPE_LABELS[s.location_type]} · Qualität {s.data_quality_score}</p>
      <p className="text-muted">{[s.address, s.city].filter(Boolean).join(", ") || "keine Adresse"}</p>
      <p className="mt-1 truncate text-xs text-muted">{(s.sources ?? []).join(", ")}</p>
    </div>
  );
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-medium">Dublettenprüfung <span className="text-lg text-muted">({rows.length})</span></h1>
        <form action={runDuplicateScan}><Button variant="secondary">Gesamten Bestand scannen</Button></form>
      </div>
      <p className="mt-2 text-sm text-muted">
        Eindeutige Treffer werden beim Import automatisch zusammengeführt. Hier stehen unsichere Fälle, z. B. Hofladen und Automat am selben Hof.
        „Zusammenführen“ behält den gewählten Eintrag und übernimmt alle Quellen des anderen.
      </p>
      <ul className="mt-6 space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Card className="p-4">
              <p className="text-xs text-muted">Wahrscheinlichkeit {(r.score * 100).toFixed(0)} % · {Math.round(r.distance_m)} m · {r.reasons.join(" · ")}</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">{side(r.a)}{side(r.b)}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={resolveDuplicate.bind(null, r.id, "keep_a")}><Button size="sm">Zusammenführen → links behalten</Button></form>
                <form action={resolveDuplicate.bind(null, r.id, "keep_b")}><Button size="sm" variant="secondary">Zusammenführen → rechts behalten</Button></form>
                <form action={resolveDuplicate.bind(null, r.id, "dismiss")}><Button size="sm" variant="ghost">Keine Dublette</Button></form>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
