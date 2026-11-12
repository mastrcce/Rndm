"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createManualLocation,
  deleteLocation,
  sanitizeEdit,
  setActive,
  unlockFields,
  updateLocationAsAdmin,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import { checkPassword, createSessionToken, SESSION_COOKIE, SESSION_TTL_S } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { mergeLocations } from "@/lib/import/pipeline";
import { importFile, importOsm, scanDuplicates } from "@/lib/import/service";

// ---------------------------------------------------------------------------
// Anmeldung
// ---------------------------------------------------------------------------
const loginAttempts = new Map<string, number[]>();

export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const now = Date.now();
  const recent = (loginAttempts.get("global") ?? []).filter((t) => now - t < 15 * 60 * 1000);
  if (recent.length >= 10) return { error: "Zu viele Versuche. Bitte 15 Minuten warten." };
  const ok = await checkPassword(String(form.get("password") ?? ""));
  if (!ok) {
    loginAttempts.set("global", [...recent, now]);
    return { error: "Passwort ist falsch (oder ADMIN_PASSWORD ist nicht konfiguriert)." };
  }
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_S,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Standorte
// ---------------------------------------------------------------------------
function formToObject(form: FormData): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string") o[k] = v;
  // Mehrfachauswahl (Checkboxen)
  if (form.has("categories")) o.categories = form.getAll("categories").map(String);
  return o;
}

export async function saveLocation(id: string, form: FormData) {
  await requireAdmin();
  await updateLocationAsAdmin(id, sanitizeEdit(formToObject(form)));
  revalidatePath(`/admin/standorte/${id}`);
  revalidatePath("/", "layout");
  redirect(`/admin/standorte/${id}?gespeichert=1`);
}

export async function createLocation(form: FormData) {
  await requireAdmin();
  const { id } = await createManualLocation(sanitizeEdit(formToObject(form)));
  revalidatePath("/", "layout");
  redirect(`/admin/standorte/${id}?angelegt=1`);
}

export async function toggleActive(id: string, active: boolean) {
  await requireAdmin();
  await setActive(id, active, active ? "vom Admin reaktiviert" : "vom Admin deaktiviert");
  revalidatePath("/", "layout");
}

export async function removeLocation(id: string) {
  await requireAdmin();
  await deleteLocation(id);
  revalidatePath("/", "layout");
  redirect("/admin/standorte?geloescht=1");
}

export async function unlockLocation(id: string) {
  await requireAdmin();
  await unlockFields(id);
  revalidatePath(`/admin/standorte/${id}`);
}

// ---------------------------------------------------------------------------
// Importe & Datenquellen
// ---------------------------------------------------------------------------
export async function startOsmImport(form: FormData) {
  await requireAdmin();
  const mode = String(form.get("mode")) === "overpass" ? "overpass" : "seed";
  const r = await importOsm(mode);
  revalidatePath("/", "layout");
  redirect(`/admin/importe?lauf=${r.runId}`);
}

export async function uploadImportFile(form: FormData) {
  await requireAdmin();
  const file = form.get("file");
  const source = String(form.get("source") ?? "file");
  if (!(file instanceof File) || file.size === 0) redirect("/admin/importe?fehler=datei");
  if (file.size > 10 * 1024 * 1024) redirect("/admin/importe?fehler=groesse");
  const allowed = await query<{ key: string }>("select key from data_sources where key = $1 and enabled", [source]);
  if (!allowed.length) redirect("/admin/importe?fehler=quelle");
  const r = await importFile(await file.text(), file.name, source);
  revalidatePath("/", "layout");
  redirect(`/admin/importe?lauf=${r.runId}`);
}

export async function toggleSource(key: string, enabled: boolean) {
  await requireAdmin();
  await query("update data_sources set enabled = $2 where key = $1", [key, enabled]);
  revalidatePath("/admin/importe");
}

// ---------------------------------------------------------------------------
// Dubletten
// ---------------------------------------------------------------------------
export async function resolveDuplicate(candidateId: number, action: "keep_a" | "keep_b" | "dismiss") {
  await requireAdmin();
  const [c] = await query<{ location_a: string; location_b: string }>("select location_a, location_b from duplicate_candidates where id = $1", [candidateId]);
  if (!c) return;
  if (action === "dismiss") {
    await query("update duplicate_candidates set status = 'dismissed', resolved_at = now() where id = $1", [candidateId]);
  } else {
    const [keep, remove] = action === "keep_a" ? [c.location_a, c.location_b] : [c.location_b, c.location_a];
    await mergeLocations(keep, remove, "admin:merge");
  }
  revalidatePath("/admin/dubletten");
  revalidatePath("/", "layout");
}

export async function runDuplicateScan() {
  await requireAdmin();
  await scanDuplicates();
  revalidatePath("/admin/dubletten");
}

// ---------------------------------------------------------------------------
// Moderation von Nutzerbeiträgen
// ---------------------------------------------------------------------------
type SubmissionRow = {
  id: number;
  kind: "report" | "suggestion" | "addition";
  location_id: string | null;
  payload: { fields: Record<string, unknown>; report_reason: string | null };
};

function fieldsToEdit(fields: Record<string, unknown>) {
  const f = { ...fields };
  if (f.raw_milk === "ja") f.raw_milk_status = "confirmed";
  delete f.raw_milk;
  return sanitizeEdit(f);
}

export async function moderateSubmission(id: number, decision: "approve" | "reject", form: FormData) {
  await requireAdmin();
  const note = String(form.get("note") ?? "").slice(0, 1000) || null;
  const [s] = await query<SubmissionRow>("select id, kind, location_id, payload from submissions where id = $1 and status = 'pending'", [id]);
  if (!s) return;
  let resultNote = note;
  let failure: string | null = null;
  if (decision === "approve") try {
    const source = `submission:${s.id}`;
    if (s.kind === "suggestion") {
      const fields = { ...s.payload.fields };
      const lat = form.get("latitude");
      const lon = form.get("longitude");
      if (lat && lon) {
        fields.latitude = lat;
        fields.longitude = lon;
      }
      const { slug } = await createManualLocation(fieldsToEdit(fields), source);
      resultNote = `${note ?? ""} Angelegt: /standort/${slug}`.trim();
    } else if (s.kind === "addition" && s.location_id) {
      const edit = fieldsToEdit(s.payload.fields);
      if (Array.isArray(edit.categories)) {
        // Ergänzung: neue Produkte hinzufügen, bestehende nicht entfernen
        const [cur] = await query<{ categories: string[] }>("select categories from locations where id = $1", [s.location_id]);
        edit.categories = sanitizeEdit({ categories: [...(cur?.categories ?? []), ...(edit.categories as string[])] }).categories;
      }
      await updateLocationAsAdmin(s.location_id, edit, source);
    } else if (s.kind === "report" && s.location_id) {
      const reason = s.payload.report_reason;
      if (reason === "closed") await setActive(s.location_id, false, `Meldung #${s.id}: geschlossen`);
      if (reason === "no_raw_milk") {
        await updateLocationAsAdmin(s.location_id, { raw_milk_status: "not_raw" }, source);
        await setActive(s.location_id, false, `Meldung #${s.id}: keine Rohmilch`);
      }
    }
  } catch (e) {
    failure = (e as Error).message;
  }
  if (failure) redirect(`/admin/meldungen?fehler=${encodeURIComponent(failure)}`);
  await query("update submissions set status = $2, reviewed_at = now(), reviewer_note = $3 where id = $1", [
    id, decision === "approve" ? "approved" : "rejected", resultNote,
  ]);
  revalidatePath("/admin/meldungen");
  revalidatePath("/", "layout");
}
