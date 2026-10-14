import crypto from "node:crypto";
import { getDb } from "@/lib/db";

export type TokenPurpose = "reset" | "setup";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
// Minutes. Setup via Google uses a shorter lifetime (the user is present).
export const TTL = { reset: 30, setup: 60, setupGoogle: 15 } as const;

/** Creates a single-use token and returns the RAW value (only its SHA-256 is stored). */
export async function createToken(userId: number, purpose: TokenPurpose, ttlMinutes: number = TTL[purpose]) {
  const sql = getDb();
  // A new request supersedes earlier unused tokens of the same purpose.
  await sql`UPDATE auth_tokens SET used_at = now()
             WHERE user_id = ${userId} AND purpose = ${purpose} AND used_at IS NULL`;
  // Housekeeping: drop long-dead tokens.
  await sql`DELETE FROM auth_tokens WHERE expires_at < now() - interval '1 day'`;
  const raw = crypto.randomBytes(32).toString("base64url");
  await sql`INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at)
            VALUES (${userId}, ${purpose}, ${sha256(raw)}, now() + make_interval(mins => ${ttlMinutes}))`;
  return raw;
}

export interface ValidToken {
  id: number;
  purpose: TokenPurpose;
  user_id: number;
  email: string;
  name: string;
  password_hash: string | null;
}

export async function findValidToken(raw: unknown): Promise<ValidToken | null> {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 200) return null;
  const rows = await getDb()<ValidToken[]>`
    SELECT t.id, t.purpose, u.id AS user_id, u.email, u.name, u.password_hash
      FROM auth_tokens t JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = ${sha256(raw)} AND t.used_at IS NULL AND t.expires_at > now()`;
  return rows[0] ?? null;
}
