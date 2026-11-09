// Applies drizzle/*.sql over Neon's HTTP driver (drizzle-kit migrate needs websockets).
// Usage: pnpm db:migrate   (reads DATABASE_URL from .env)
import { neon } from "@neondatabase/serverless";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = neon(url);

await sql.query(`create table if not exists _chalk_migrations (name text primary key, applied_at timestamptz not null default now())`);
const done = new Set((await sql.query(`select name from _chalk_migrations`)).map((r) => r.name));

// Tables from 0000 may already exist from a manual run; record it without re-applying.
if (!done.has("0000_init.sql")) {
  const [{ exists }] = await sql.query(`select to_regclass('public.shops') is not null as exists`);
  if (exists) {
    await sql.query(`insert into _chalk_migrations (name) values ('0000_init.sql')`);
    done.add("0000_init.sql");
  }
}

const dir = "drizzle";
for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  if (done.has(file)) continue;
  const statements = readFileSync(join(dir, file), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);
  await sql.transaction([
    ...statements.map((s) => sql.query(s)),
    sql.query(`insert into _chalk_migrations (name) values ($1)`, [file]),
  ]);
  console.log("applied", file);
}
console.log("migrations up to date");
