"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { LOCATION_TYPE_LABELS } from "@/lib/categories";
import type { MapPoint } from "@/lib/types";

export function FavoritesList() {
  const fav = useFavorites();
  const [loaded, setLoaded] = useState<{ key: string; points: MapPoint[] } | null>(null);
  const key = fav.ids.join(",");
  useEffect(() => {
    if (!key) return;
    let alive = true;
    fetch(`/api/locations?ids=${key}`)
      .then((r) => r.json())
      .then((j: { points: MapPoint[] }) => alive && setLoaded({ key, points: j.points ?? [] }))
      .catch(() => alive && setLoaded({ key, points: [] }));
    return () => {
      alive = false;
    };
  }, [key]);
  // Entfernte Favoriten sofort ausblenden, ohne neu zu laden
  const points = !key ? [] : loaded ? loaded.points.filter((p) => fav.ids.includes(p.id)) : null;

  if (points === null) return <p className="text-muted">Wird geladen …</p>;
  if (!points.length)
    return (
      <div className="rounded-xl2 border border-dashed border-sage-300 bg-white p-8 text-center">
        <Heart className="mx-auto size-8 text-sage-500" aria-hidden />
        <p className="mt-3 text-muted">Noch keine Favoriten. Tippe bei einem Standort auf das Herz, um ihn zu merken.</p>
        <Button asChild className="mt-4"><Link href="/#karte">Zur Karte</Link></Button>
      </div>
    );
  return (
    <ul className="space-y-3">
      {points.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4 rounded-xl2 border border-line bg-white p-4 shadow-soft">
          <div className="min-w-0">
            <Link href={`/standort/${p.slug}`} className="font-medium text-forest-900 hover:underline">{p.name}</Link>
            <p className="truncate text-sm text-muted">{[p.addr, [p.pc, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Adresse: Keine Angabe"}</p>
            <Badge variant="outline" className="mt-1">{LOCATION_TYPE_LABELS[p.type]}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={() => fav.toggle(p.id)} aria-label="Aus Favoriten entfernen">
            <Heart className="fill-forest-800 text-forest-800" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
