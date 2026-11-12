import { Flame } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Gut sichtbarer Hinweis gemäß Tier-LMHV: Rohmilch vor dem Verzehr abkochen. */
export function SafetyNotice({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <aside
      role="note"
      className={cn("flex items-start gap-3 rounded-xl2 border border-wheat/40 bg-warn-bg px-4 py-3 text-warn-fg", className)}
    >
      <Flame className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p className="text-sm leading-relaxed">
        <strong className="font-semibold">Rohmilch vor dem Verzehr abkochen.</strong>{" "}
        {compact ? null : "Rohmilch ist unbehandelt und kann krankmachende Keime enthalten. Besonders Kinder, Schwangere, ältere und immungeschwächte Menschen sollten sie nur abgekocht trinken. "}
        <Link href="/rohmilch" className="font-medium underline underline-offset-2">Mehr erfahren</Link>
      </p>
    </aside>
  );
}
