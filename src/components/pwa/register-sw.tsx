"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (nur im Produktionsbetrieb, damit die Entwicklung nicht gecacht wird). */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
