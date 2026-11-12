import Link from "next/link";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_SLUGS, type Category } from "@/lib/categories";

const TEXT: Record<Category, string> = {
  milk: "Rohmilchautomaten & Milchtankstellen",
  eggs: "Eierautomaten & Hofläden",
  honey: "Imkereien & Honigautomaten",
  meat: "Hofmetzgereien & Fleischautomaten",
  cheese: "Hofkäsereien & Hofläden",
};

export function CategoryCards({ counts }: { counts?: Partial<Record<Category, number>> }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CATEGORIES.map((c) => (
        <li key={c}>
          <Link href={`/${CATEGORY_SLUGS[c]}`} className="group flex h-full flex-col rounded-xl2 border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-lift">
            <span className="grid size-10 place-items-center rounded-full bg-sage-100 text-forest-800 group-hover:bg-forest-800 group-hover:text-cream-50">
              <CategoryIcon category={c} className="size-5" />
            </span>
            <span className="mt-3 font-display text-lg font-semibold text-forest-900">{CATEGORY_LABELS[c]}</span>
            <span className="mt-0.5 text-xs text-muted">{TEXT[c]}</span>
            {counts?.[c] != null && <span className="mt-2 text-sm font-medium tabular-nums text-forest-700">{counts[c]!.toLocaleString("de-DE")} Standorte</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
