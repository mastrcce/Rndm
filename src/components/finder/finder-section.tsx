"use client";

import { ArrowUpDown, BadgeCheck, Clock, Heart, List, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/use-favorites";
import { CategoryIcon } from "@/components/category-icon";
import { CATEGORIES, CATEGORY_LABELS, LOCATION_TYPE_LABELS, LOCATION_TYPE_PLURAL, LOCATION_TYPES, type Category, type LocationType } from "@/lib/categories";
import {
  applyFilters,
  countActiveFilters,
  DEFAULT_FILTERS,
  inBounds,
  PAYMENT_FILTERS,
  RADIUS_OPTIONS,
  sortResults,
  type ResultPoint,
  type SortMode,
} from "@/lib/filter";
import { formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { useFinder } from "./finder-context";
import { legendSvg } from "./marker-icons";

const FinderMap = dynamic(() => import("./finder-map"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-sage-100 text-sm text-muted">Karte wird geladen …</div>,
});

const PAGE = 60;

function Chip({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-[color,background-color,border-color,transform] duration-150 ease-out motion-safe:active:scale-[0.97]",
        active ? "border-forest-800 bg-forest-800 text-cream-50" : "border-line bg-white text-forest-900 hover:border-sage-400",
      )}
    >
      {children}
    </button>
  );
}

export function FinderSection({ initialBbox, title = "Alle Standorte auf der Karte", className }: { initialBbox?: [number, number, number, number] | null; title?: string; className?: string }) {
  const f = useFinder();
  const { filters, setFilters } = f;
  const [mobileView, setMobileView] = useState<"map" | "list">("map");
  const [showMore, setShowMore] = useState(false);
  // Anzeige-Limit, das bei Änderung von Filtern/Ausschnitt/Sortierung zurückgesetzt wird
  const [limitState, setLimitState] = useState<{ deps: unknown[]; n: number }>({ deps: [], n: PAGE });
  const favorites = useFavorites();
  const listRef = useRef<HTMLDivElement>(null);

  // Die Öffnungszeiten-Bibliothek ist groß: erst laden, wenn „Jetzt geöffnet“ gewählt wird
  const [ohLib, setOhLib] = useState<typeof import("@/lib/opening-hours") | null>(null);
  useEffect(() => {
    if (!filters.openNow || ohLib) return;
    let alive = true;
    import("@/lib/opening-hours").then((m) => alive && setOhLib(m));
    return () => {
      alive = false;
    };
  }, [filters.openNow, ohLib]);
  const openNowFn = useMemo(() => {
    if (!filters.openNow) return undefined;
    const now = new Date();
    // Solange die Bibliothek lädt, gilt „unbekannt“ (Standorte werden kurz ausgeblendet)
    return (p: ResultPoint | { oh: string | null; lat: number; lon: number; state: string | null }) =>
      ohLib ? ohLib.isOpenAt(p.oh, { lat: p.lat, lon: p.lon, state: p.state }, now) : null;
  }, [filters.openNow, ohLib]);

  const filtered = useMemo(
    () => applyFilters(f.points, filters, f.origin, openNowFn),
    [f.points, filters, f.origin, openNowFn],
  );
  const visible = useMemo(() => {
    const inView = f.bounds ? filtered.filter((p) => inBounds(p, f.bounds!)) : filtered;
    return sortResults(inView, f.sort);
  }, [filtered, f.bounds, f.sort]);

  const limitDeps = [filters, f.bounds, f.sort];
  const limit = limitState.deps.length && limitState.deps.every((d, i) => d === limitDeps[i]) ? limitState.n : PAGE;
  const setLimit = (fn: (n: number) => number) => setLimitState({ deps: limitDeps, n: fn(limit) });

  // Ausgewählten Eintrag in der Liste sichtbar machen
  useEffect(() => {
    if (!f.selectedId) return;
    const node = listRef.current?.querySelector(`[data-id="${f.selectedId}"]`);
    node?.scrollIntoView({ block: "nearest", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [f.selectedId]);

  const toggleCategory = (c: Category) =>
    setFilters((s) => ({ ...s, categories: s.categories.includes(c) ? s.categories.filter((x) => x !== c) : [...s.categories, c] }));
  const catCounts = useMemo(() => {
    const n = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const p of f.points) for (const c of p.cat) n[c]++;
    return n;
  }, [f.points]);
  const toggleType = (t: LocationType) =>
    setFilters((s) => ({ ...s, types: s.types.includes(t) ? s.types.filter((x) => x !== t) : [...s.types, t] }));
  const togglePayment = (k: string) =>
    setFilters((s) => ({ ...s, payments: s.payments.includes(k) ? s.payments.filter((x) => x !== k) : [...s.payments, k] }));
  const activeCount = countActiveFilters(filters);

  return (
    <section id="karte" className={cn("scroll-mt-20", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-medium sm:text-3xl">{title}</h2>
          </div>
          <div className="flex gap-2 lg:hidden" role="tablist" aria-label="Ansicht">
            <Chip active={mobileView === "map"} onClick={() => setMobileView("map")}><MapIcon className="size-4" /> Karte</Chip>
            <Chip active={mobileView === "list"} onClick={() => setMobileView("list")}><List className="size-4" /> Liste ({visible.length})</Chip>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-4 rounded-xl2 border border-line bg-white p-3 shadow-soft sm:p-4">
          <fieldset className="mb-3 border-b border-line pb-3">
            <legend className="mb-2 text-sm font-medium text-forest-800">Was suchst du?</legend>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => {
                const active = filters.categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCategory(c)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-[color,background-color,border-color,transform] duration-150 ease-out motion-safe:active:scale-[0.97]",
                      active ? "border-forest-800 bg-forest-800 text-cream-50" : "border-line bg-cream-50 text-forest-900 hover:border-sage-400",
                    )}
                  >
                    <CategoryIcon category={c} />
                    {CATEGORY_LABELS[c]}
                    {!f.loading && <span className={cn("text-xs tabular-nums", active ? "text-cream-200" : "text-muted")}>{catCounts[c].toLocaleString("de-DE")}</span>}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm">
              <span className="text-muted">Umkreis</span>
              <select
                className="h-full bg-transparent font-medium text-forest-900 focus:outline-none"
                value={filters.radiusKm ?? ""}
                disabled={!f.origin}
                title={f.origin ? undefined : "Erst Ort suchen oder Standort verwenden"}
                onChange={(e) => setFilters((s) => ({ ...s, radiusKm: e.target.value ? Number(e.target.value) : null }))}
              >
                <option value="">{f.origin ? "beliebig" : "– Ort wählen –"}</option>
                {RADIUS_OPTIONS.map((r) => <option key={r} value={r}>{r} km</option>)}
              </select>
            </label>
            <Button variant="ghost" size="sm" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} className="h-9 text-sm">
              <SlidersHorizontal /> Weitere Filter{activeCount ? ` (${activeCount})` : ""}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="h-9 text-muted" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>
                <X /> Zurücksetzen
              </Button>
            )}
          </div>
          {showMore && (
            <div className="mt-3 grid gap-4 border-t border-line pt-4 transition-[opacity,transform] duration-200 ease-out starting:opacity-0 motion-safe:starting:-translate-y-1 sm:grid-cols-2 lg:grid-cols-4">
              <fieldset className="space-y-2 sm:col-span-2 lg:col-span-4">
                <legend className="text-sm font-medium text-forest-800">Art des Standorts</legend>
                <div className="flex flex-wrap gap-2">
                  {LOCATION_TYPES.map((t) => (
                    <Chip key={t} active={filters.types.includes(t)} onClick={() => toggleType(t)}>
                      <span dangerouslySetInnerHTML={{ __html: legendSvg(t) }} className="-ml-1 inline-flex" aria-hidden />
                      {LOCATION_TYPE_PLURAL[t]}
                    </Chip>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-forest-800">Verfügbarkeit</legend>
                <Chip active={filters.open247} onClick={() => setFilters((s) => ({ ...s, open247: !s.open247 }))} title="Nur Standorte, für die 24/7 angegeben ist">
                  24/7 laut Angabe
                </Chip>{" "}
                <Chip active={filters.openNow} onClick={() => setFilters((s) => ({ ...s, openNow: !s.openNow }))} title="Nur Standorte mit hinterlegten Öffnungszeiten, die jetzt laut Angabe geöffnet sind">
                  <Clock className="size-4" /> Jetzt geöffnet*
                </Chip>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-forest-800">Angebot</legend>
                <Chip active={filters.onlyRawConfirmed} onClick={() => setFilters((s) => ({ ...s, onlyRawConfirmed: !s.onlyRawConfirmed }))}>
                  <BadgeCheck className="size-4" /> Rohmilch bestätigt
                </Chip>{" "}
                <Chip active={filters.organic} onClick={() => setFilters((s) => ({ ...s, organic: !s.organic }))} title="Bio-Angabe der Datenquelle – nicht von uns zertifiziert">
                  Bio (laut Quelle)
                </Chip>
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-forest-800">Bezahlung (falls bekannt)</legend>
                {Object.entries(PAYMENT_FILTERS).map(([k, v]) => (
                  <span key={k}>
                    <Chip active={filters.payments.includes(k)} onClick={() => togglePayment(k)}>{v.label}</Chip>{" "}
                  </span>
                ))}
              </fieldset>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-forest-800">Name oder Ort enthält</legend>
                <input
                  value={filters.text}
                  onChange={(e) => setFilters((s) => ({ ...s, text: e.target.value }))}
                  placeholder="z. B. Milchhäusle"
                  className="h-9 w-full rounded-full border border-line px-3 text-sm focus:border-sage-500 focus:outline-none"
                />
              </fieldset>
              <p className="text-xs text-muted sm:col-span-2 lg:col-span-4">
                * „Jetzt geöffnet“ und „24/7“ beruhen ausschließlich auf den hinterlegten Öffnungszeiten der Datenquelle und wurden nicht vor Ort geprüft.
                Standorte ohne Öffnungszeiten werden bei diesen Filtern ausgeblendet.
              </p>
            </div>
          )}
        </div>

        {f.error && <p className="mt-3 rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn-fg">{f.error}</p>}

        {/* Liste + Karte */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[400px_1fr]">
          <div className={cn("flex min-h-0 flex-col rounded-xl2 border border-line bg-white shadow-soft lg:h-[680px]", mobileView === "map" && "hidden lg:flex")}>
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="text-sm text-muted">
                <strong className="font-semibold text-forest-900">{visible.length.toLocaleString("de-DE")}</strong> im Kartenausschnitt
              </p>
              <label className="flex h-9 items-center gap-1 text-sm text-muted">
                <ArrowUpDown className="size-3.5" aria-hidden />
                <span className="sr-only">Sortierung</span>
                <select value={f.sort} onChange={(e) => f.setSort(e.target.value as SortMode)} className="h-full bg-transparent font-medium text-forest-900 focus:outline-none">
                  <option value="distance" disabled={!f.origin}>Entfernung{f.origin ? "" : " (Ort wählen)"}</option>
                  <option value="name">Name</option>
                  <option value="quality">Vollständigkeit</option>
                </select>
              </label>
            </div>
            <div ref={listRef} className="max-h-[70vh] flex-1 overflow-y-auto lg:max-h-none">
              {!f.loading && visible.length === 0 && (
                <div className="p-6 text-center text-sm text-muted">
                  Keine Standorte im sichtbaren Kartenausschnitt. Verkleinere die Karte oder passe die Filter an.
                </div>
              )}
              <ul className="divide-y divide-line">
                {visible.slice(0, limit).map((p) => (
                  <li
                    key={p.id}
                    data-id={p.id}
                    onMouseEnter={() => f.setHoveredId(p.id)}
                    onMouseLeave={() => f.setHoveredId(null)}
                    className={cn("group relative px-4 py-3 transition-colors hover:bg-cream-50", f.selectedId === p.id && "bg-sage-100/70")}
                  >
                    <div className="flex items-start gap-3">
                      <span dangerouslySetInnerHTML={{ __html: legendSvg(p.type) }} className="mt-0.5 inline-flex shrink-0" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => { f.setSelectedId(p.id); setMobileView("map"); }}
                          className="text-left font-medium text-forest-900 hover:underline"
                        >
                          {p.name}
                        </button>
                        <p className="truncate text-sm text-muted">
                          {[p.addr, [p.pc, p.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") || "Adresse: Keine Angabe"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{LOCATION_TYPE_LABELS[p.type]}</Badge>
                          {p.cat.map((c) => (
                            <span key={c} title={CATEGORY_LABELS[c]} className="inline-flex size-5 items-center justify-center text-forest-700">
                              <CategoryIcon category={c} className="size-3.5" />
                              <span className="sr-only">{CATEGORY_LABELS[c]}</span>
                            </span>
                          ))}
                          {p.raw === "confirmed" && p.cat.includes("milk") && <Badge variant="success"><BadgeCheck /> Rohmilch bestätigt</Badge>}
                          {p.h24 && <Badge>24/7 laut Angabe</Badge>}
                          {p.distance != null && <span className="text-xs font-medium text-forest-700">{formatDistance(p.distance)}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => favorites.toggle(p.id)}
                        aria-pressed={favorites.has(p.id)}
                        aria-label={favorites.has(p.id) ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
                        className="-m-1.5 grid size-10 shrink-0 place-items-center rounded-full text-muted transition-[color,background-color,transform] duration-150 ease-out hover:bg-sage-100 hover:text-forest-800 motion-safe:active:scale-90"
                      >
                        <Heart className={cn("size-4", favorites.has(p.id) && "fill-forest-800 text-forest-800")} />
                      </button>
                    </div>
                    <Link href={`/standort/${p.slug}`} className="ml-[22px] mt-0.5 inline-block rounded-full px-2 py-1.5 text-xs font-medium text-sage-600 hover:bg-sage-100 hover:text-forest-800">
                      Details ansehen →
                    </Link>
                  </li>
                ))}
              </ul>
              {visible.length > limit && (
                <div className="p-3 text-center">
                  <Button variant="secondary" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                    Weitere {Math.min(PAGE, visible.length - limit)} anzeigen
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className={cn("relative overflow-hidden rounded-xl2 border border-line shadow-soft", mobileView === "list" && "hidden lg:block")}>
            <FinderMap
              className="h-[65vh] min-h-[420px] w-full lg:h-[680px]"
              points={filtered}
              origin={f.origin}
              radiusKm={filters.radiusKm}
              selectedId={f.selectedId}
              hoveredId={f.hoveredId}
              focus={f.focus}
              initialBbox={initialBbox}
              onBoundsChange={f.setBounds}
              onSelect={f.setSelectedId}
            />
            <div className="pointer-events-none absolute bottom-6 left-3 z-[500] hidden rounded-2xl bg-white px-3 py-2 text-xs sm:block">
              <div className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-full bg-wheat ring-2 ring-white" /> Rohmilch laut Quelle bestätigt</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
