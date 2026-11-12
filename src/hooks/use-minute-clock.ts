"use client";

import { useSyncExternalStore } from "react";

function subscribe(cb: () => void) {
  const t = setInterval(cb, 30_000);
  return () => clearInterval(t);
}
const getSnapshot = () => Math.floor(Date.now() / 60_000);
const getServerSnapshot = () => 0;

/** Aktuelle Zeit (minutengenau) – auf dem Server `null`, damit keine Hydration-Abweichung entsteht. */
export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return minute ? new Date(minute * 60_000) : null;
}
