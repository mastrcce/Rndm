/**
 * CLI für den Datenimport.
 *
 *   npm run import:osm -- --mode seed                 # mitgelieferte OSM-Daten (offline)
 *   npm run import:osm -- --mode overpass             # live aus OpenStreetMap
 *   npm run import:osm -- --mode snapshot --dir PATH  # aus einem farmshops.eu-Klon
 *   npm run import:file -- daten.csv --source findhilde
 *   npm run dedupe                                    # Bestand auf Dubletten prüfen
 *   npx tsx scripts/import/run.ts build-seed --dir PATH   # Seed-Dateien aus farmshops.eu-Klon erzeugen
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { loadEnv } from "../env";
loadEnv();

import { pool } from "../../src/lib/db";
import { filterProductElements, readFarmshopsSnapshot, SEED_PATH, type SeedFile } from "../../src/lib/import/adapters/osm";
import { buildPlaceSeed, PLACES_SEED_PATH, rebuildPlaces } from "../../src/lib/import/places";
import { importFile, importOsm, scanDuplicates, type OsmMode } from "../../src/lib/import/service";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function ensureFarmshopsClone(dir: string) {
  if (fs.existsSync(path.join(dir, "data"))) return;
  console.log(`Klone github.com/CodeforKarlsruhe/farmshops.eu nach ${dir} …`);
  fs.mkdirSync(path.dirname(dir), { recursive: true });
  execFileSync("git", ["clone", "--depth", "1", "https://github.com/CodeforKarlsruhe/farmshops.eu", dir], { stdio: "inherit" });
}

async function main() {
  const cmd = process.argv[2];
  const echo = (l: string) => console.log(l);

  if (cmd === "osm") {
    const mode = (arg("mode") ?? "seed") as OsmMode;
    const dir = arg("dir") ?? ".cache/farmshops.eu";
    if (mode === "snapshot") ensureFarmshopsClone(dir);
    const r = await importOsm(mode, { dir, echo });
    if (!r.ok) process.exitCode = 1;
  } else if (cmd === "file") {
    const file = process.argv[3];
    if (!file || file.startsWith("--")) throw new Error("Pfad zur Datei fehlt.");
    const source = arg("source") ?? "file";
    const r = await importFile(fs.readFileSync(file, "utf8"), path.basename(file), source, echo);
    if (!r.ok) process.exitCode = 1;
  } else if (cmd === "dedupe") {
    console.log(`${await scanDuplicates()} neue Dublettenkandidaten.`);
  } else if (cmd === "places") {
    await rebuildPlaces(echo);
  } else if (cmd === "build-seed") {
    const dir = arg("dir") ?? ".cache/farmshops.eu";
    ensureFarmshopsClone(dir);
    const all = readFarmshopsSnapshot(dir, echo);
    const head = fs.readFileSync(path.join(dir, "data", "farmshopGeoJson.js"), "utf8").slice(0, 200);
    const stand = head.match(/Datenabgleich: (\d{2})\.(\d{2})\.(\d{4})/);
    const generatedAt = stand ? `${stand[3]}-${stand[2]}-${stand[1]}` : new Date().toISOString().slice(0, 10);
    const products = filterProductElements(all);
    const seed: SeedFile = {
      generatedAt,
      source: "OpenStreetMap via farmshops.eu (github.com/CodeforKarlsruhe/farmshops.eu)",
      license: "ODbL 1.0 – © OpenStreetMap-Mitwirkende",
      elements: products.sort((a, b) => `${a.osmType}${a.osmId}`.localeCompare(`${b.osmType}${b.osmId}`)),
    };
    fs.mkdirSync(path.dirname(SEED_PATH), { recursive: true });
    fs.writeFileSync(SEED_PATH, JSON.stringify(seed));
    const places = buildPlaceSeed(all).sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
    fs.writeFileSync(PLACES_SEED_PATH, JSON.stringify(places));
    console.log(`Seed: ${products.length} Standorte mit Hofprodukten, ${places.length} Ortseinträge (Stand ${generatedAt}).`);
    return;
  } else {
    console.log(fs.readFileSync(__filename, "utf8").split("*/")[0]);
    return;
  }
  await pool().end();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
