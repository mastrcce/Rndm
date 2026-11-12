import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { CATEGORIES, CATEGORY_LABELS, LOCATION_TYPE_LABELS, type LocationType } from "@/lib/categories";
import { query } from "@/lib/db";
import { STATES } from "@/lib/states";

export const metadata = { title: "Standorte" };

const FLAGS: Record<string, string> = {
  no_address: "ohne Adresse", no_city: "ohne Ort", no_opening_hours: "ohne Öffnungszeiten", no_name: "ohne Namen",
  osm_fixme: "OSM-FIXME", possibly_disused: "evtl. stillgelegt", multi_source: "mehrere Quellen", state_mismatch: "Bundesland widersprüchlich",
};

type SP = Promise<Record<string, string | undefined>>;

export default async function AdminLocations({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.seite ?? 1));
  const per = 50;
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace("?", `$${params.length}`)); };
  if (sp.q) add("(name ilike ? or city ilike $X or postal_code like $X or slug like $X)".replace(/\$X/g, `$${params.length + 1}`), `%${sp.q}%`);
  if (sp.land) add("state = ?", sp.land);
  if (sp.typ) add("location_type = ?::location_type", sp.typ);
  if (sp.produkt) add("? = any(categories)", sp.produkt);
  if (sp.flag === "no_name") where.push("name_is_generated");
  else if (sp.flag) add("? = any(quality_flags)", sp.flag);
  if (sp.quelle) add("exists(select 1 from location_sources s where s.location_id = locations.id and s.source = ?)", sp.quelle);
  where.push(sp.aktiv === "nein" ? "not is_active" : sp.aktiv === "alle" ? "true" : "is_active");
  const order = sp.sort === "qualitaet" ? "data_quality_score asc, name" : sp.sort === "geaendert" ? "updated_at desc" : "name";
  const sql = `from locations where ${where.join(" and ")}`;
  const [{ n }] = await query<{ n: number }>(`select count(*)::int n ${sql}`, params);
  const rows = await query<{ id: string; name: string; slug: string; city: string | null; state: string | null; location_type: LocationType; data_quality_score: number; is_active: boolean; quality_flags: string[]; raw_milk_status: string; locked_fields: string[] }>(
    `select id, name, slug, city, state, location_type, data_quality_score, is_active, quality_flags, raw_milk_status, locked_fields ${sql} order by ${order} limit ${per} offset ${(page - 1) * per}`,
    params,
  );
  const qs = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...p })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `?${u.toString()}`;
  };
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-medium">Standorte <span className="text-lg text-muted">({n.toLocaleString("de-DE")})</span></h1>
        <Button asChild><Link href="/admin/standorte/neu">Neuer Standort</Link></Button>
      </div>
      {sp.geloescht && <p className="mt-3 rounded-2xl bg-sage-100 px-4 py-2 text-sm">Standort gelöscht.</p>}
      <form className="mt-4 grid gap-2 rounded-xl2 border border-line bg-white p-3 sm:grid-cols-3 lg:grid-cols-8">
        <Input name="q" defaultValue={sp.q} placeholder="Name, Ort, PLZ …" className="lg:col-span-2" />
        <Select name="land" defaultValue={sp.land ?? ""}><option value="">Alle Länder</option>{STATES.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}</Select>
        <Select name="produkt" defaultValue={sp.produkt ?? ""}><option value="">Alle Produkte</option>{CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</Select>
        <Select name="typ" defaultValue={sp.typ ?? ""}><option value="">Alle Arten</option>{Object.entries(LOCATION_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="flag" defaultValue={sp.flag ?? ""}><option value="">Alle Datensätze</option>{Object.entries(FLAGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        <Select name="aktiv" defaultValue={sp.aktiv ?? ""}><option value="">Aktive</option><option value="nein">Deaktivierte</option><option value="alle">Alle</option></Select>
        <Select name="sort" defaultValue={sp.sort ?? ""}><option value="">Name</option><option value="qualitaet">Qualität aufsteigend</option><option value="geaendert">Zuletzt geändert</option></Select>
        <Button type="submit" variant="secondary" className="sm:col-span-3 lg:col-span-8 lg:justify-self-end">Filtern</Button>
      </form>
      <div className="mt-4 overflow-x-auto rounded-xl2 border border-line bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-cream-50 text-sm text-muted">
            <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Ort</th><th className="px-3 py-2">Art</th><th className="px-3 py-2">Qualität</th><th className="px-3 py-2">Hinweise</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.id} className={r.is_active ? "" : "opacity-60"}>
                <td className="px-3 py-2">
                  <Link href={`/admin/standorte/${r.id}`} className="font-medium text-forest-900 hover:underline">{r.name}</Link>
                  {!r.is_active && <Badge variant="warn" className="ml-2">inaktiv</Badge>}
                  {r.locked_fields.length > 0 && <Badge variant="outline" className="ml-2">redigiert</Badge>}
                </td>
                <td className="px-3 py-2 text-muted">{r.city ?? "–"}{r.state ? `, ${r.state}` : ""}</td>
                <td className="px-3 py-2">{LOCATION_TYPE_LABELS[r.location_type]}{r.raw_milk_status === "confirmed" ? " · Rohmilch bestätigt" : ""}</td>
                <td className="px-3 py-2 tabular-nums">{r.data_quality_score}</td>
                <td className="px-3 py-2 text-xs text-muted">{r.quality_flags.filter((f) => f !== "no_city").map((f) => FLAGS[f] ?? f).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted">Seite {page} von {Math.max(1, Math.ceil(n / per))}</span>
        <div className="flex gap-2">
          {page > 1 && <Button asChild variant="secondary" size="sm"><Link href={qs({ seite: page - 1 })}>Zurück</Link></Button>}
          {page * per < n && <Button asChild variant="secondary" size="sm"><Link href={qs({ seite: page + 1 })}>Weiter</Link></Button>}
        </div>
      </div>
    </div>
  );
}
