// Counts events per key inside a window. Uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set, so the limit is shared by every serverless instance. Without
// them it falls back to per-instance memory (fine for local dev / demos, weak on Vercel).
export interface Limit {
  max: number;
  windowS: number;
}
export const LOGIN_LIMIT: Limit = { max: 5, windowS: 600 }; // 5 failures / 10 min
export const FORGOT_LIMIT: Limit = { max: 5, windowS: 900 }; // 5 requests / 15 min
export const MAIL_LIMIT: Limit = { max: 3, windowS: 900 }; // 3 emails / 15 min per account

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = new Map<string, number[]>();

async function redis(cmds: (string | number)[][]) {
  const res = await fetch(`${URL_}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  return (await res.json()) as { result: unknown }[];
}

function recent(key: string, windowS: number) {
  const now = Date.now();
  const list = (mem.get(key) ?? []).filter((t) => now - t < windowS * 1000);
  mem.set(key, list);
  return list;
}

export async function isLimited(keys: string[], { max, windowS }: Limit = LOGIN_LIMIT): Promise<boolean> {
  if (!URL_ || !TOKEN) return keys.some((k) => recent(k, windowS).length >= max);
  try {
    const out = await redis(keys.map((k) => ["GET", `rl:${k}`]));
    return out.some((r) => Number(r.result ?? 0) >= max);
  } catch (e) {
    console.error("rate limit store unavailable (failing open)", e);
    return false;
  }
}

export async function recordHit(keys: string[], { windowS }: Limit = LOGIN_LIMIT) {
  if (!URL_ || !TOKEN) return keys.forEach((k) => recent(k, windowS).push(Date.now()));
  try {
    await redis(keys.flatMap((k) => [["INCR", `rl:${k}`], ["EXPIRE", `rl:${k}`, windowS, "NX"]]));
  } catch (e) {
    console.error("rate limit store unavailable", e);
  }
}

export async function clearHits(keys: string[]) {
  if (!URL_ || !TOKEN) return keys.forEach((k) => mem.delete(k));
  try {
    await redis(keys.map((k) => ["DEL", `rl:${k}`]));
  } catch (e) {
    console.error("rate limit store unavailable", e);
  }
}
