// Creates the tables and seeds the sample users (safe to re-run).  npm run db:setup
import fs from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const sql = postgres(url, { max: 1 });
await sql.unsafe(fs.readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
const [{ count }] = await sql`SELECT count(*)::int AS count FROM users`;
console.log(`Database ready. ${count} users.`);
await sql.end();
