"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_FILTERS, type Bounds, type FilterState, type SortMode } from "@/lib/filter";
import type { LatLon } from "@/lib/geo";
import type { MapPoint, PlaceResult } from "@/lib/types";

export type Origin = LatLon & { label: string; kind: "gps" | "place" };
export type Focus = { lat: number; lon: number; zoom?: number; bbox?: [number, number, number, number] | null; key: number };

type Ctx = {
  points: MapPoint[];
  loading: boolean;
  error: string | null;
  filters: FilterState;
  setFilters: (f: FilterState | ((f: FilterState) => FilterState)) => void;
  origin: Origin | null;
  setOrigin: (o: Origin | null) => void;
  sort: SortMode;
  setSort: (s: SortMode) => void;
  bounds: Bounds | null;
  setBounds: (b: Bounds) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  focus: Focus | null;
  requestFocus: (f: Omit<Focus, "key">) => void;
  choosePlace: (p: PlaceResult) => void;
  locate: () => void;
  locating: boolean;
  locateError: string | null;
};

const FinderContext = createContext<Ctx | null>(null);

export function useFinder() {
  const c = useContext(FinderContext);
  if (!c) throw new Error("useFinder muss innerhalb von <FinderProvider> verwendet werden");
  return c;
}

export function FinderProvider({
  children,
  initialFilters,
}: {
  children: React.ReactNode;
  initialFilters?: Partial<FilterState>;
}) {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({ ...DEFAULT_FILTERS, ...initialFilters });
  const [origin, setOriginState] = useState<Origin | null>(null);
  const [sort, setSort] = useState<SortMode>("quality");
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/locations")
      .then((r) => r.json())
      .then((j: { points: MapPoint[]; error?: string }) => {
        if (!alive) return;
        setPoints(j.points ?? []);
        if (j.error) setError(j.error);
      })
      .catch(() => alive && setError("Standorte konnten nicht geladen werden."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const requestFocus = useCallback((f: Omit<Focus, "key">) => setFocus({ ...f, key: Date.now() }), []);

  const setOrigin = useCallback((o: Origin | null) => {
    setOriginState(o);
    if (o) setSort("distance");
    else setFilters((f) => ({ ...f, radiusKm: null }));
  }, []);

  const choosePlace = useCallback(
    (p: PlaceResult) => {
      if (p.kind === "state") {
        setOriginState(null);
        setFilters((f) => ({ ...f, radiusKm: null }));
        requestFocus({ lat: p.lat, lon: p.lon, bbox: p.bbox ?? null });
        return;
      }
      setOrigin({ lat: p.lat, lon: p.lon, label: p.label, kind: "place" });
      setFilters((f) => ({ ...f, radiusKm: f.radiusKm ?? 25 }));
      requestFocus({ lat: p.lat, lon: p.lon, zoom: 11 });
    },
    [requestFocus, setOrigin],
  );

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setLocateError("Dein Browser unterstützt keine Standortbestimmung.");
      return;
    }
    setLocating(true);
    setLocateError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const o = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setOrigin({ ...o, label: "Dein Standort", kind: "gps" });
        setFilters((f) => ({ ...f, radiusKm: f.radiusKm ?? 25 }));
        requestFocus({ ...o, zoom: 11 });
      },
      (err) => {
        setLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? "Standortfreigabe wurde abgelehnt. Du kannst stattdessen nach Ort oder PLZ suchen."
            : "Standort konnte nicht ermittelt werden.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }, [requestFocus, setOrigin]);

  const value = useMemo<Ctx>(
    () => ({
      points, loading, error, filters, setFilters, origin, setOrigin, sort, setSort, bounds, setBounds,
      selectedId, setSelectedId, hoveredId, setHoveredId, focus, requestFocus, choosePlace, locate, locating, locateError,
    }),
    [points, loading, error, filters, origin, setOrigin, sort, bounds, selectedId, hoveredId, focus, requestFocus, choosePlace, locate, locating, locateError],
  );

  return <FinderContext.Provider value={value}>{children}</FinderContext.Provider>;
}
