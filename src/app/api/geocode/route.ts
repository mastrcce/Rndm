import { NextResponse } from "next/server";
import { geocode } from "@/lib/server/geocode";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.slice(0, 120) ?? "";
  if (q.trim().length < 2) return NextResponse.json({ results: [] });
  try {
    const results = await geocode(q);
    return NextResponse.json({ results }, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ results: [], error: "Suche derzeit nicht verfügbar" }, { status: 503 });
  }
}
