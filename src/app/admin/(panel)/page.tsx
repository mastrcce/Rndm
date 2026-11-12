import Link from "next/link";
import { Card } from "@/components/ui/card";
import { adminStats } from "@/lib/admin";
import { CATEGORY_LABELS, LOCATION_TYPE_LABELS, type Category, type LocationType } from "@/lib/categories";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Übersicht" };

function Kpi({ label, value, href, tone }: { label: string; value: number | string; href?: string; tone?: "warn" }) {
  const inner = (
    <Card className={`p-4 ${tone === "warn" && Number(value) > 0 ? "border-wheat/60 bg-warn-bg" : ""}`}>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-medium tabular-nums text-forest-900">{typeof value === "number" ? value.toLocaleString("de-DE") : value}</p>
    </Card>
  );
  return href ? <Link href={href} className="block hover:opacity-90">{inner}</Link> : inner;
}

export default async function AdminHome() {
  const { s, byType, byCategory, byState, runs } = await adminStats();
  const maxState = Math.max(...byState.map((x) => x.n), 1);
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-medium">Übersicht</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Aktive Standorte" value={s.active} href="/admin/standorte" />
        <Kpi label="Rohmilch bestätigt" value={s.raw_confirmed} />
        <Kpi label="Ø Vollständigkeit" value={`${s.avg_quality ?? 0} / 100`} />
        <Kpi label="Deaktiviert" value={s.inactive} href="/admin/standorte?aktiv=nein" />
        <Kpi label="Offene Meldungen" value={s.pending_submissions} href="/admin/meldungen" tone="warn" />
        <Kpi label="Offene Dubletten" value={s.open_duplicates} href="/admin/dubletten" tone="warn" />
        <Kpi label="Mehrere Quellen" value={s.multi_source} href="/admin/standorte?flag=multi_source" />
        <Kpi label="Geringe Qualität (< 40)" value={s.low_quality} href="/admin/standorte?sort=qualitaet" />
      </div>

      <section>
        <h2 className="text-xl font-medium">Fehlerhafte oder unvollständige Datensätze</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Kpi label="Ohne Adresse" value={s.no_address} href="/admin/standorte?flag=no_address" />
          <Kpi label="Ohne Öffnungszeiten" value={s.no_hours} href="/admin/standorte?flag=no_opening_hours" />
          <Kpi label="Ohne Namen" value={s.no_name} href="/admin/standorte?flag=no_name" />
          <Kpi label="OSM-FIXME" value={s.fixme} href="/admin/standorte?flag=osm_fixme" tone="warn" />
          <Kpi label="Evtl. stillgelegt" value={s.disused} href="/admin/standorte?flag=possibly_disused" tone="warn" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-medium">Nach Art</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byType.map((t) => (
              <li key={t.location_type} className="flex justify-between"><span>{LOCATION_TYPE_LABELS[t.location_type as LocationType]}</span><span className="tabular-nums">{t.n}</span></li>
            ))}
          </ul>
          <h2 className="mt-6 text-lg font-medium">Nach Produkt</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {byCategory.map((t) => (
              <li key={t.category} className="flex justify-between">
                <Link href={`/admin/standorte?produkt=${t.category}`} className="hover:underline">{CATEGORY_LABELS[t.category as Category] ?? t.category}</Link>
                <span className="tabular-nums">{t.n}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-medium">Nach Bundesland</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {byState.map((t) => (
              <li key={t.state} className="grid grid-cols-[170px_1fr_40px] items-center gap-2">
                <span className="truncate">{t.state}</span>
                <span className="h-2 rounded-full bg-sage-400" style={{ width: `${(t.n / maxState) * 100}%` }} />
                <span className="text-right tabular-nums">{t.n}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Letzte Importe</h2>
          <Link href="/admin/importe" className="text-sm text-forest-800 underline">Alle Importe</Link>
        </div>
        <ul className="mt-3 divide-y divide-line text-sm">
          {runs.map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>#{r.id} · {r.source} · {r.mode}</span>
              <span className={r.status === "failed" ? "text-red-700" : "text-muted"}>
                {r.status} · {formatDate(r.started_at)} {r.started_at.toLocaleTimeString("de-DE", { timeZone: "Europe/Berlin" })}
                {typeof r.stats?.created === "number" ? ` · ${r.stats.created} neu, ${r.stats.updated} geändert` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
