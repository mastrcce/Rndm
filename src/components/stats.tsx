import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES, type Category } from "@/lib/categories";

const WITH: Record<Category, string> = { milk: "Milch", eggs: "Eiern", honey: "Honig", meat: "Fleisch & Wurst", cheese: "Käse" };
import type { Stats } from "@/lib/types";

export function StatsGrid({ stats }: { stats: Stats }) {
  const items = [
    { value: stats.vending, label: "Rohmilch- & Milchautomaten" },
    { value: stats.total, label: "Verkaufsstellen insgesamt" },
    { value: stats.farms, label: "Bauernhöfe & Hofläden" },
    { value: stats.states, label: "Bundesländer vertreten" },
  ];
  return (
    <div>
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="rounded-xl2 border border-line bg-white/80 px-4 py-4 shadow-soft backdrop-blur sm:px-5">
          <dt className="text-xs font-medium text-muted sm:text-sm">{i.label}</dt>
          <dd className="mt-1 font-display text-3xl font-semibold tabular-nums text-forest-900 sm:text-4xl">
            {i.value.toLocaleString("de-DE")}
          </dd>
        </div>
      ))}
    </dl>
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted" aria-label="Standorte nach Produkt">
      {CATEGORIES.map((c) => (
        <li key={c} className="inline-flex items-center gap-1.5">
          <CategoryIcon category={c} className="size-4 text-sage-600" />
          <span><strong className="font-semibold tabular-nums text-forest-900">{stats.byCategory[c].toLocaleString("de-DE")}</strong> mit {WITH[c]}</span>
        </li>
      ))}
    </ul>
    </div>
  );
}
