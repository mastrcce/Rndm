"use client";

import type * as Leaflet from "leaflet";
import { useEffect, useLayoutEffect, useRef } from "react";
import type { Bounds, ResultPoint } from "@/lib/filter";
import { GERMANY_BOUNDS, type LatLon } from "@/lib/geo";
import { markerHtml } from "./marker-icons";
import { popupHtml } from "./popup";

type Props = {
  points: ResultPoint[];
  origin: LatLon | null;
  radiusKm: number | null;
  selectedId: string | null;
  hoveredId: string | null;
  focus: { lat: number; lon: number; zoom?: number; bbox?: [number, number, number, number] | null; key: number } | null;
  initialBbox?: [number, number, number, number] | null;
  onBoundsChange: (b: Bounds) => void;
  onSelect: (id: string | null) => void;
  className?: string;
};

type MapState = {
  L: typeof Leaflet;
  map: Leaflet.Map;
  cluster: Leaflet.MarkerClusterGroup;
  markers: Map<string, Leaflet.Marker>;
  originLayer: Leaflet.LayerGroup;
  iconCache: Map<string, Leaflet.DivIcon>;
};

export default function FinderMap(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const state = useRef<MapState | null>(null);
  const propsRef = useRef(props);
  useLayoutEffect(() => {
    propsRef.current = props;
  });
  const ready = useRef<Promise<MapState> | null>(null);

  // Karte initialisieren
  useEffect(() => {
    let cancelled = false;
    ready.current = (async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof Leaflet }).L = L;
      await import("leaflet.markercluster");
      if (cancelled || !el.current) throw new Error("unmounted");
      const map = L.map(el.current, { zoomControl: true, scrollWheelZoom: true, preferCanvas: false, minZoom: 5 });
      const b = propsRef.current.initialBbox;
      if (b) map.fitBounds([[b[1], b[0]], [b[3], b[2]]], { padding: [20, 20] });
      else map.fitBounds(GERMANY_BOUNDS);
      L.tileLayer(process.env.NEXT_PUBLIC_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ??
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
      }).addTo(map);
      const cluster = L.markerClusterGroup({
        showCoverageOnHover: false,
        maxClusterRadius: 50,
        spiderfyOnMaxZoom: true,
        chunkedLoading: true,
        iconCreateFunction: (c) => {
          const n = c.getChildCount();
          const size = n < 10 ? 34 : n < 100 ? 40 : 48;
          return L.divIcon({
            html: `<div style="width:${size}px;height:${size}px">${n}</div>`,
            className: "rm-cluster",
            iconSize: [size, size],
          });
        },
      });
      map.addLayer(cluster);
      const originLayer = L.layerGroup().addTo(map);
      const emit = () => {
        const bb = map.getBounds();
        propsRef.current.onBoundsChange({ south: bb.getSouth(), west: bb.getWest(), north: bb.getNorth(), east: bb.getEast() });
      };
      map.on("moveend", emit);
      map.on("popupclose", () => propsRef.current.onSelect(null));
      const s: MapState = { L, map, cluster, markers: new Map(), originLayer, iconCache: new Map() };
      state.current = s;
      emit();
      return s;
    })();
    ready.current.catch(() => {});
    return () => {
      cancelled = true;
      state.current?.map.remove();
      state.current = null;
    };
  }, []);

  // Marker aktualisieren
  useEffect(() => {
    ready.current?.then((s) => {
      const { L, cluster, markers, iconCache } = s;
      const wanted = new Set(props.points.map((p) => p.id));
      const toRemove: Leaflet.Marker[] = [];
      for (const [id, m] of markers) if (!wanted.has(id)) { toRemove.push(m); markers.delete(id); }
      cluster.removeLayers(toRemove);
      const toAdd: Leaflet.Marker[] = [];
      for (const p of props.points) {
        const existing = markers.get(p.id);
        if (existing) {
          existing.setPopupContent(popupHtml(p));
          continue;
        }
        const key = `${p.type}:${p.raw === "confirmed"}`;
        let icon = iconCache.get(key);
        if (!icon) {
          icon = L.divIcon({ html: markerHtml(p.type, p.raw === "confirmed"), className: "rm-marker", iconSize: [34, 42], iconAnchor: [17, 41], popupAnchor: [0, -36] });
          iconCache.set(key, icon);
        }
        const m = L.marker([p.lat, p.lon], { icon, title: p.name, keyboard: true, alt: p.name });
        m.bindPopup(popupHtml(p), { maxWidth: 280, autoPanPadding: [30, 30] });
        m.on("click", () => propsRef.current.onSelect(p.id));
        markers.set(p.id, m);
        toAdd.push(m);
      }
      cluster.addLayers(toAdd);
    }).catch(() => {});
  }, [props.points]);

  // Auswahl (z. B. Klick in der Liste) -> Marker zeigen & Popup öffnen
  useEffect(() => {
    if (!props.selectedId) return;
    ready.current?.then((s) => {
      const m = s.markers.get(props.selectedId!);
      if (!m) return;
      if (m.isPopupOpen()) return;
      s.cluster.zoomToShowLayer(m, () => m.openPopup());
    }).catch(() => {});
  }, [props.selectedId]);

  // Hover-Hervorhebung
  useEffect(() => {
    ready.current?.then((s) => {
      for (const [id, m] of s.markers) {
        const node = m.getElement();
        if (node) node.classList.toggle("is-active", id === props.hoveredId);
      }
    }).catch(() => {});
  }, [props.hoveredId]);

  // Bezugspunkt + Umkreis
  useEffect(() => {
    ready.current?.then((s) => {
      const { L, map, originLayer } = s;
      originLayer.clearLayers();
      if (!props.origin) return;
      const o = props.origin;
      L.marker([o.lat, o.lon], {
        icon: L.divIcon({ html: '<div class="rm-user-dot"></div>', className: "rm-marker", iconSize: [16, 16], iconAnchor: [8, 8] }),
        interactive: false,
        keyboard: false,
      }).addTo(originLayer);
      if (props.radiusKm) {
        const circle = L.circle([o.lat, o.lon], {
          radius: props.radiusKm * 1000,
          color: "#1f4d33",
          weight: 1.5,
          fillColor: "#84a06e",
          fillOpacity: 0.08,
          interactive: false,
        }).addTo(originLayer);
        map.fitBounds(circle.getBounds(), { padding: [10, 10] });
      }
    }).catch(() => {});
  }, [props.origin, props.radiusKm]);

  // Externe Fokus-Anforderung (Suche)
  useEffect(() => {
    const f = props.focus;
    if (!f) return;
    ready.current?.then(({ map }) => {
      if (f.bbox) map.fitBounds([[f.bbox[1], f.bbox[0]], [f.bbox[3], f.bbox[2]]], { padding: [20, 20], maxZoom: 13 });
      else map.flyTo([f.lat, f.lon], f.zoom ?? 12, { duration: 0.8 });
    }).catch(() => {});
  }, [props.focus]);

  return (
    <div
      ref={el}
      className={props.className}
      role="region"
      aria-label="Karte der Rohmilch-Verkaufsstellen"
    />
  );
}
