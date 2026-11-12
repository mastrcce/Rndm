export const STATES = [
  { code: "DE-BW", name: "Baden-Württemberg", slug: "baden-wuerttemberg" },
  { code: "DE-BY", name: "Bayern", slug: "bayern" },
  { code: "DE-BE", name: "Berlin", slug: "berlin" },
  { code: "DE-BB", name: "Brandenburg", slug: "brandenburg" },
  { code: "DE-HB", name: "Bremen", slug: "bremen" },
  { code: "DE-HH", name: "Hamburg", slug: "hamburg" },
  { code: "DE-HE", name: "Hessen", slug: "hessen" },
  { code: "DE-MV", name: "Mecklenburg-Vorpommern", slug: "mecklenburg-vorpommern" },
  { code: "DE-NI", name: "Niedersachsen", slug: "niedersachsen" },
  { code: "DE-NW", name: "Nordrhein-Westfalen", slug: "nordrhein-westfalen" },
  { code: "DE-RP", name: "Rheinland-Pfalz", slug: "rheinland-pfalz" },
  { code: "DE-SL", name: "Saarland", slug: "saarland" },
  { code: "DE-SN", name: "Sachsen", slug: "sachsen" },
  { code: "DE-ST", name: "Sachsen-Anhalt", slug: "sachsen-anhalt" },
  { code: "DE-SH", name: "Schleswig-Holstein", slug: "schleswig-holstein" },
  { code: "DE-TH", name: "Thüringen", slug: "thueringen" },
] as const;

export type StateInfo = (typeof STATES)[number];

export function stateBySlug(slug: string): StateInfo | undefined {
  return STATES.find((s) => s.slug === slug);
}

export function stateByName(name: string | null | undefined): StateInfo | undefined {
  if (!name) return undefined;
  const n = name.trim().toLowerCase();
  return STATES.find((s) => s.name.toLowerCase() === n || s.slug === n || s.code.toLowerCase() === n);
}
