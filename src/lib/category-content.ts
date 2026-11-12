import type { Category } from "./categories";

/** Texte für die Produkt-Landingpages (nur sachliche, allgemeine Aussagen). */
export const CATEGORY_PAGE: Record<Exclude<Category, "milk">, { title: string; headline: (where: string) => string; intro: string; hint: string }> = {
  eggs: {
    title: "Eier vom Hof",
    headline: (w) => `Eier vom Hof in ${w}`,
    intro: "Eierautomaten, Hofläden und Bauernhöfe, die laut Datenquelle Eier direkt ab Hof verkaufen.",
    hint: "Eier aus Direktvermarktung gekühlt lagern und das Mindesthaltbarkeitsdatum beachten.",
  },
  honey: {
    title: "Honig vom Imker",
    headline: (w) => `Honig vom Imker in ${w}`,
    intro: "Imkereien, Hofläden und Automaten, die laut Datenquelle Honig verkaufen.",
    hint: "Honig sollte Kindern unter einem Jahr nicht gegeben werden.",
  },
  meat: {
    title: "Fleisch & Wurst vom Hof",
    headline: (w) => `Fleisch & Wurst vom Hof in ${w}`,
    intro: "Hofläden, Automaten und Betriebe, die laut Datenquelle Fleisch oder Wurst direkt vermarkten.",
    hint: "Frisches Fleisch gekühlt transportieren und lagern.",
  },
  cheese: {
    title: "Käse vom Hof",
    headline: (w) => `Käse vom Hof in ${w}`,
    intro: "Hofkäsereien, Hofläden und Automaten, die laut Datenquelle Käse verkaufen.",
    hint: "Rohmilchkäse ist für Schwangere und Menschen mit geschwächtem Immunsystem nicht empfohlen.",
  },
};
