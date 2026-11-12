"use client";

import type * as Leaflet from "leaflet";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { LocationType } from "@/lib/categories";
import { markerHtml } from "../finder/marker-icons";

export default function MiniMap({ lat, lon, type, confirmed, className, draggable, onMove, hideMarker, zoom }: {
  lat: number; lon: number; type: LocationType; confirmed: boolean; className?: string;
  draggable?: boolean; onMove?: (lat: number, lon: number) => void;
  /** Marker erst anzeigen, wenn eine Position gewählt wurde */
  hideMarker?: boolean;
  zoom?: number;
}) {
  const el = useRef<HTMLDivElement>(null);
  const marker = useRef<Leaflet.Marker | null>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const onMoveRef = useRef(onMove);
  useLayoutEffect(() => {
    onMoveRef.current = onMove;
  });

  useEffect(() => {
    let map: Leaflet.Map | null = null;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([lat, lon], zoom ?? (draggable ? 13 : 15));
      mapRef.current = map;
      L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ?? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      }).addTo(map);
      marker.current = L.marker([lat, lon], {
        draggable: !!draggable,
        icon: L.divIcon({ html: markerHtml(type, confirmed), className: "rm-marker", iconSize: [34, 42], iconAnchor: [17, 41] }),
      });
      if (!hideMarker) marker.current.addTo(map);
      if (draggable) {
        marker.current.on("dragend", () => {
          const p = marker.current!.getLatLng();
          onMoveRef.current?.(p.lat, p.lng);
        });
        map.on("click", (e: Leaflet.LeafletMouseEvent) => {
          marker.current!.setLatLng(e.latlng);
          if (!map!.hasLayer(marker.current!)) marker.current!.addTo(map!);
          onMoveRef.current?.(e.latlng.lat, e.latlng.lng);
        });
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!marker.current || !mapRef.current) return;
    marker.current.setLatLng([lat, lon]);
    if (!hideMarker && !mapRef.current.hasLayer(marker.current)) marker.current.addTo(mapRef.current);
  }, [lat, lon, hideMarker]);

  return <div ref={el} className={className} role="img" aria-label="Lage des Standorts auf der Karte" />;
}
