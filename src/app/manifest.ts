import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Rohmilch-Atlas – Milch ab Hof in Deutschland",
    short_name: "Rohmilch-Atlas",
    description: "Rohmilchautomaten, Milchtankstellen und Hofläden in deiner Nähe finden.",
    lang: "de-DE",
    dir: "ltr",
    start_url: "/?quelle=app",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f8f4ea",
    theme_color: "#1f4d33",
    categories: ["food", "lifestyle", "navigation"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Karte", url: "/?quelle=app#karte", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meine Favoriten", url: "/favoriten", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Standort vorschlagen", url: "/standort-vorschlagen", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
