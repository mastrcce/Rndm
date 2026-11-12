import { Beef, Egg, Hexagon, Milk } from "lucide-react";
import type { Category } from "@/lib/categories";

/** Käse-Symbol (eigene Zeichnung, damit es zu den lucide-Icons passt). */
function CheeseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 13.5 15 6l6 4v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3 13.5h18" />
      <circle cx="8" cy="16" r="0.8" fill="currentColor" />
      <circle cx="15" cy="15.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function CategoryIcon({ category, className = "size-4" }: { category: Category; className?: string }) {
  switch (category) {
    case "milk":
      return <Milk className={className} aria-hidden />;
    case "eggs":
      return <Egg className={className} aria-hidden />;
    case "honey":
      return <Hexagon className={className} aria-hidden />;
    case "meat":
      return <Beef className={className} aria-hidden />;
    case "cheese":
      return <CheeseIcon className={className} />;
  }
}
