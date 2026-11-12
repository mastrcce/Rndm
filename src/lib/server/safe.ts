import "server-only";

/** Führt eine Datenbankabfrage aus und liefert bei Fehler einen Ersatzwert (Seite bleibt erreichbar). */
export async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<{ data: T; ok: boolean }> {
  try {
    return { data: await fn(), ok: true };
  } catch (e) {
    console.error("[db]", (e as Error).message);
    return { data: fallback, ok: false };
  }
}

export const EMPTY_STATS = { byCategory: { milk: 0, eggs: 0, honey: 0, meat: 0, cheese: 0 }, vending: 0, total: 0, farms: 0, states: 0, rawConfirmed: 0, lastImport: null };
