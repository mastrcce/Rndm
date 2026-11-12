/*
 * Service Worker des Rohmilch-Atlas.
 *
 * - App-Gerüst und Next.js-Dateien (/_next/static) werden zwischengespeichert,
 *   damit die App schnell startet.
 * - Die Standortliste (/api/locations) wird "stale-while-revalidate" gecacht:
 *   offline sind die zuletzt geladenen Standorte weiter auf Karte und Liste sichtbar.
 * - Besuchte Seiten (z. B. Standort-Details) sind offline erneut abrufbar.
 * - Kartenkacheln werden begrenzt zwischengespeichert.
 * - Admin-Bereich, Meldungen und Ortssuche werden nie gecacht.
 */
const VERSION = "v1";
const STATIC_CACHE = `ra-static-${VERSION}`;
const PAGE_CACHE = `ra-pages-${VERSION}`;
const DATA_CACHE = `ra-data-${VERSION}`;
const TILE_CACHE = `ra-tiles-${VERSION}`;
const OFFLINE_URL = "/offline";
// Startseite und Favoriten sind immer offline verfügbar
const PRECACHE = [OFFLINE_URL, "/", "/favoriten", "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_PAGES = 40;
const MAX_TILES = 400;

/** Lädt die von einer HTML-Seite referenzierten Next.js-Dateien (JS/CSS) in den Cache. */
async function precacheAssetsOf(response) {
  const html = await response.clone().text();
  const urls = [...new Set(html.match(/\/_next\/static\/[^"'\s)\\]+/g) || [])];
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    urls.map(async (u) => {
      if (await cache.match(u)) return;
      try {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      } catch {
        /* einzelne Datei optional */
      }
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      for (const url of PRECACHE) {
        const res = await fetch(url, { cache: "reload" });
        if (!res.ok) continue;
        await cache.put(url, res.clone());
        if (res.headers.get("content-type")?.includes("text/html")) await precacheAssetsOf(res);
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGE_CACHE, DATA_CACHE, TILE_CACHE]);
      for (const key of await caches.keys()) if (key.startsWith("ra-") && !keep.has(key)) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok || res.type === "opaque") {
    cache.put(request, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  return hit || (await network) || new Response(JSON.stringify({ points: [], error: "Offline – keine gespeicherten Standorte" }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

/** Favoriten offline: Auswahl aus der zuletzt gespeicherten Gesamtliste. */
async function favoritesFromCache(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(DATA_CACHE);
    const all = await cache.match("/api/locations");
    const ids = new URL(request.url).searchParams.get("ids")?.split(",") ?? [];
    const json = all ? await all.json() : { points: [] };
    const points = (json.points || []).filter((p) => ids.includes(p.id));
    return new Response(JSON.stringify({ points, offline: true }), { headers: { "Content-Type": "application/json" } });
  }
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const res = await fetch(request);
    if (res.ok && res.headers.get("content-type")?.includes("text/html")) {
      cache.put(request, res.clone());
      trim(PAGE_CACHE, MAX_PAGES);
    }
    return res;
  } catch {
    return (
      (await cache.match(request, { ignoreSearch: true })) ||
      (await caches.match(request, { ignoreSearch: true })) || // vorab gespeicherte Seiten (/, /favoriten)
      (await caches.match(OFFLINE_URL))
    );
  }
}

const isTile = (url) => /\/\d+\/\d+\/\d+(@2x)?\.(png|jpg|webp)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    if (request.destination === "image" && isTile(url)) event.respondWith(cacheFirst(request, TILE_CACHE, MAX_TILES));
    return;
  }
  // Nie cachen: Admin, Meldungen, Ortssuche, Next.js-Datenanfragen beim Seitenwechsel
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/api/submissions") || url.pathname.startsWith("/api/geocode")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/_next/image")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  if (url.pathname === "/api/locations") {
    if (url.searchParams.has("ids")) event.respondWith(favoritesFromCache(request));
    else if (!url.search) event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
