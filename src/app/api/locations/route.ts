import { NextResponse } from "next/server";
import { getMapPoints, getPointsWhere } from "@/lib/locations";

export const revalidate = 600;

/**
 * GET /api/locations            – alle aktiven Standorte (kompakt) für Karte und Liste
 * GET /api/locations?ids=a,b    – ausgewählte Standorte (z. B. Favoriten)
 * GET /api/locations?bbox=minLon,minLat,maxLon,maxLat – Standorte im Kartenausschnitt
 */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  try {
    const ids = sp.get("ids");
    if (ids) {
      const list = ids.split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x)).slice(0, 200);
      const points = list.length ? await getPointsWhere("id = any($1::uuid[])", [list]) : [];
      return NextResponse.json({ points });
    }
    const bbox = sp.get("bbox")?.split(",").map(Number);
    if (bbox && bbox.length === 4 && bbox.every(Number.isFinite)) {
      const points = await getPointsWhere(
        "geom && st_makeenvelope($1,$2,$3,$4,4326)::geography",
        bbox,
        5000,
      );
      return NextResponse.json({ points });
    }
    const points = await getMapPoints();
    return NextResponse.json(
      { points, generatedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" } },
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ points: [], error: "Datenbank nicht erreichbar" }, { status: 503 });
  }
}
