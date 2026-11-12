import Link from "next/link";
import { Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { query } from "@/lib/db";
import { REPORT_REASONS } from "@/lib/submissions";
import { formatDate } from "@/lib/utils";
import { moderateSubmission } from "../../actions";

export const metadata = { title: "Moderation" };

const KIND: Record<string, string> = { report: "Fehlermeldung", suggestion: "Neuer Standort", addition: "Ergänzung" };

export default async function ModerationPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const status = sp.status === "erledigt" ? "done" : "pending";
  const rows = await query<{ id: number; kind: string; location_id: string | null; loc_name: string | null; loc_slug: string | null; payload: { fields: Record<string, unknown>; report_reason: string | null }; message: string | null; contact_email: string | null; status: string; created_at: Date; reviewer_note: string | null }>(
    `select s.*, l.name loc_name, l.slug loc_slug from submissions s left join locations l on l.id = s.location_id
      where ${status === "pending" ? "s.status = 'pending'" : "s.status <> 'pending'"} order by s.created_at desc limit 100`,
  );
  return (
    <div>
      <h1 className="text-3xl font-medium">Moderation</h1>
      <div className="mt-3 flex gap-2 text-sm">
        <Link href="/admin/meldungen" className={status === "pending" ? "font-semibold underline" : "text-muted"}>Offen</Link>
        <Link href="/admin/meldungen?status=erledigt" className={status === "done" ? "font-semibold underline" : "text-muted"}>Erledigt</Link>
      </div>
      {sp.fehler && <p className="mt-3 rounded-2xl bg-warn-bg px-4 py-2 text-sm text-warn-fg">Übernahme fehlgeschlagen: {sp.fehler}</p>}
      {rows.length === 0 && <p className="mt-6 text-muted">Keine Einträge.</p>}
      <ul className="mt-4 space-y-3">
        {rows.map((r) => {
          const fields = Object.entries(r.payload.fields ?? {}).filter(([, v]) => v != null && v !== "");
          return (
            <li key={r.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="solid">{KIND[r.kind]}</Badge>
                  <span className="text-xs text-muted">#{r.id} · {formatDate(r.created_at)}</span>
                  {r.status !== "pending" && <Badge variant={r.status === "approved" ? "success" : "outline"}>{r.status === "approved" ? "übernommen" : "abgelehnt"}</Badge>}
                </div>
                {r.loc_slug && <p className="mt-2 text-sm">Standort: <Link className="underline" href={`/admin/standorte/${r.location_id}`}>{r.loc_name}</Link> (<Link className="underline" href={`/standort/${r.loc_slug}`} target="_blank">öffentlich</Link>)</p>}
                {r.payload.report_reason && <p className="mt-1 text-sm font-medium">{REPORT_REASONS[r.payload.report_reason]}</p>}
                {fields.length > 0 && (
                  <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[180px_1fr]">
                    {fields.map(([k, v]) => (<Fragment key={k}><dt className="text-muted">{k}</dt><dd className="break-words">{String(v)}</dd></Fragment>))}
                  </dl>
                )}
                {r.message && <p className="mt-2 whitespace-pre-wrap rounded-2xl bg-cream-50 p-3 text-sm">{r.message}</p>}
                {r.contact_email && <p className="mt-1 text-xs text-muted">Kontakt: {r.contact_email}</p>}
                {r.reviewer_note && <p className="mt-1 text-xs text-muted">Notiz: {r.reviewer_note}</p>}
                {r.status === "pending" && (
                  <form className="mt-3 flex flex-wrap items-end gap-2">
                    {r.kind === "suggestion" && (
                      <>
                        <Input name="latitude" placeholder="Breitengrad" defaultValue={String(r.payload.fields.latitude ?? "")} className="w-36" />
                        <Input name="longitude" placeholder="Längengrad" defaultValue={String(r.payload.fields.longitude ?? "")} className="w-36" />
                      </>
                    )}
                    <Input name="note" placeholder="Notiz (optional)" className="min-w-48 flex-1" />
                    <Button size="sm" formAction={moderateSubmission.bind(null, r.id, "approve")}>Übernehmen</Button>
                    <Button size="sm" variant="secondary" formAction={moderateSubmission.bind(null, r.id, "reject")}>Ablehnen</Button>
                  </form>
                )}
                {r.status === "pending" && r.kind === "report" && !["closed", "no_raw_milk"].includes(r.payload.report_reason ?? "") && (
                  <p className="mt-2 text-xs text-muted">Hinweis: Diese Meldung ändert nichts automatisch – bitte den Standort bei Bedarf manuell bearbeiten und die Meldung dann übernehmen.</p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
