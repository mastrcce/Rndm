"use client";

import { LocateFixed } from "lucide-react";
import { useState } from "react";
import { distanceMeters, formatDistance } from "@/lib/geo";

export function DistanceToUser({ lat, lon }: { lat: number; lon: number }) {
  const [state, setState] = useState<{ d?: number; err?: string; busy?: boolean }>({});
  if (state.d != null) return <span>{formatDistance(state.d)} Luftlinie von deinem Standort</span>;
  return (
    <span>
      <button
        type="button"
        className="inline-flex items-center gap-1 font-medium text-forest-800 underline underline-offset-2"
        onClick={() => {
          if (!navigator.geolocation) return setState({ err: "Nicht unterstützt" });
          setState({ busy: true });
          navigator.geolocation.getCurrentPosition(
            (p) => setState({ d: distanceMeters({ lat: p.coords.latitude, lon: p.coords.longitude }, { lat, lon }) }),
            () => setState({ err: "Standort nicht verfügbar" }),
            { timeout: 10000, maximumAge: 300000 },
          );
        }}
      >
        <LocateFixed className="size-3.5" /> {state.busy ? "Wird ermittelt …" : "Entfernung berechnen"}
      </button>
      {state.err && <span className="ml-2 text-muted">{state.err}</span>}
      <span className="block text-xs text-muted">Dein Standort wird nur im Browser verwendet.</span>
    </span>
  );
}
