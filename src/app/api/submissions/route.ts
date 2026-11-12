import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { submissionSchema } from "@/lib/submissions";

// Einfache Ratenbegrenzung pro Instanz (zusätzlich zur Moderation)
const hits = new Map<string, number[]>();
function rateLimited(key: string, max = 5, windowMs = 10 * 60 * 1000) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(key, list);
  return list.length > max;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "Zu viele Meldungen. Bitte später erneut versuchen." }, { status: 429 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Ungültige Anfrage" }, { status: 400 });
  }
  const parsed = submissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const s = parsed.data;
  if (s.website_confirm) return NextResponse.json({ ok: true }); // Bot – stillschweigend verwerfen
  if (s.kind === "suggestion" && (s.fields.latitude == null || s.fields.longitude == null) && !s.fields.address) {
    return NextResponse.json({ ok: false, error: "Bitte Adresse angeben oder Position auf der Karte setzen." }, { status: 400 });
  }
  if (s.kind !== "suggestion" && !s.location_id) {
    return NextResponse.json({ ok: false, error: "Standort fehlt." }, { status: 400 });
  }
  try {
    const payload = { fields: s.fields, report_reason: s.report_reason ?? null };
    const [row] = await query<{ id: string }>(
      `insert into submissions (kind, location_id, payload, message, contact_email) values ($1,$2,$3,$4,$5) returning id`,
      [s.kind, s.location_id ?? null, payload, s.message ?? null, s.contact_email ?? null],
    );
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Speichern fehlgeschlagen" }, { status: 500 });
  }
}
