// Creates all tables and seeds the sample users + cafe menus (safe to re-run).  npm run db:setup
//   schema.sql       portal: users, auth_tokens, sample users
//   cafe-schema.sql  CafeConnect tables
//   cafe-seed.sql    CafeConnect cafes, categories and menus
import fs from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1, onnotice: () => {} });
for (const file of ["schema.sql", "cafe-schema.sql", "cafe-seed.sql"]) {
  await sql.unsafe(fs.readFileSync(new URL(`./${file}`, import.meta.url), "utf8"));
}
const [{ users }] = await sql`SELECT count(*)::int AS users FROM users`;
const [{ cafes, items }] = await sql`SELECT (SELECT count(*)::int FROM "Cafe") AS cafes, (SELECT count(*)::int FROM "MenuItem") AS items`;
console.log(`Database ready. ${users} users, ${cafes} cafes, ${items} menu items.`);
await sql.end();
