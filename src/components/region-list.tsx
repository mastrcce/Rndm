import { BadgeCheck } from "lucide-react";
import Link from "next/link";
import { LOCATION_TYPE_LABELS } from "@/lib/categories";
import { formatDistance } from "@/lib/geo";
import type { MapPoint } from "@/lib/types";

/** Serverseitig gerenderte, indexierbare Liste von Standorten. */
export function RegionList({ points, title }: { points: (MapPoint & { distance?: number })[]; title: string }) {
  if (!points.length) return null;
  return (
    <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6">
      <h2 className="text-2xl font-medium sm:text-3xl">{title}</h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {points.map((p) => (
          <li key={p.id}>
            <Link href={`/standort/${p.slug}`} className="block h-full rounded-xl2 border border-line bg-white p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-sage-300 hover:shadow-lift">
              <p className="text-xs font-semibold uppercase tracking-wide text-sage-600">{LOCATION_TYPE_LABELS[p.type]}{p.distance != null ? ` · ${formatDistance(p.distance)}` : ""}</p>
              <p className="mt-1 font-medium text-forest-900">{p.name}</p>
              <p className="mt-0.5 text-sm text-muted">{[p.addr, [p.pc, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Adresse: Keine Angabe"}</p>
              {p.raw === "confirmed" && p.cat.includes("milk") && <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-800"><BadgeCheck className="size-3.5" /> Rohmilch laut Quelle bestätigt</p>}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
