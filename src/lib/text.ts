/** Wandelt Text in einen URL-tauglichen Slug (deutsche Umlaute werden transkribiert). */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const NAME_STOPWORDS = new Set([
  "milchtankstelle", "milchautomat", "milch", "automat", "hofladen", "bauernhof", "hof",
  "der", "die", "das", "am", "an", "im", "in", "zum", "zur", "und", "familie", "fam",
  "gbr", "kg", "gmbh", "ohg", "e", "k", "biohof", "milchhof", "milchviehbetrieb",
]);

export function normalizeForCompare(input: string | null | undefined): string {
  if (!input) return "";
  return slugify(input).replace(/-/g, " ").trim();
}

/** Bedeutungstragende Tokens eines Namens (ohne generische Wörter wie „Milchtankstelle“). */
export function nameTokens(input: string | null | undefined): string[] {
  return normalizeForCompare(input)
    .split(" ")
    .filter((t) => t.length > 1 && !NAME_STOPWORDS.has(t));
}

function bigrams(s: string): Map<string, number> {
  const m = new Map<string, number>();
  const t = ` ${s} `;
  for (let i = 0; i < t.length - 1; i++) {
    const g = t.slice(i, i + 2);
    m.set(g, (m.get(g) ?? 0) + 1);
  }
  return m;
}

/** Dice-Koeffizient auf Zeichen-Bigrammen (0..1). */
export function stringSimilarity(a: string, b: string): number {
  const x = normalizeForCompare(a);
  const y = normalizeForCompare(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ba = bigrams(x);
  const bb = bigrams(y);
  let overlap = 0;
  for (const [g, c] of ba) overlap += Math.min(c, bb.get(g) ?? 0);
  const total = [...ba.values()].reduce((s, v) => s + v, 0) + [...bb.values()].reduce((s, v) => s + v, 0);
  return (2 * overlap) / total;
}

/** Ähnlichkeit zweier Betriebsnamen, generische Wörter werden ignoriert. */
export function nameSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return 0;
  const sa = new Set(ta);
  const shared = tb.filter((t) => sa.has(t)).length;
  const tokenScore = shared / Math.min(ta.length, tb.length);
  return Math.max(tokenScore, stringSimilarity(ta.join(" "), tb.join(" ")));
}

/** Normalisiert eine Straßenangabe für Vergleiche ("Hauptstr. 5" == "Hauptstraße 5"). */
export function normalizeStreet(street: string | null | undefined): string {
  return normalizeForCompare(street)
    .replace(/\bstrasse\b/g, "str")
    .replace(/strasse\b/g, "str")
    .replace(/\bstr\b/g, "str")
    .replace(/\s+/g, " ")
    .trim();
}
