import postgres from "postgres";

// One client per server instance, reused across hot reloads in dev. Use the provider's
// pooled connection string on Vercel. All queries are parameterised (tagged templates).
const g = globalThis as unknown as { __sql?: postgres.Sql };

export function getDb(): postgres.Sql {
  if (!g.__sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g.__sql = postgres(url, { max: 3, idle_timeout: 20, connect_timeout: 10 });
  }
  return g.__sql;
}
