import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "../env";
loadEnv();
import { pool } from "../../src/lib/db";

async function main() {
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const p = pool();
  await p.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await p.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
  for (const f of files) {
    if (done.has(f)) continue;
    console.log(`→ ${f}`);
    const sql = fs.readFileSync(path.join(dir, f), "utf8");
    const client = await p.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (name) values ($1)", [f]);
      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  }
  console.log("Migrationen aktuell.");
  await p.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
