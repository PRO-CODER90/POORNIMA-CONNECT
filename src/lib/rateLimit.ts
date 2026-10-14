// 5 failures / 10 min per key. Uses Upstash Redis (REST) when UPSTASH_REDIS_REST_URL and
// UPSTASH_REDIS_REST_TOKEN are set, so the limit is shared by every serverless instance.
// Without them it falls back to per-instance memory (fine for local dev / demos).
const WINDOW_S = 600;
const MAX_FAILS = 5;

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

function recent(key: string) {
  const now = Date.now();
  const list = (mem.get(key) ?? []).filter((t) => now - t < WINDOW_S * 1000);
  mem.set(key, list);
  return list;
}

export async function isLimited(...keys: string[]): Promise<boolean> {
  if (!URL_ || !TOKEN) return keys.some((k) => recent(k).length >= MAX_FAILS);
  try {
    const out = await redis(keys.map((k) => ["GET", `rl:${k}`]));
    return out.some((r) => Number(r.result ?? 0) >= MAX_FAILS);
  } catch (e) {
    console.error("rate limit store unavailable (failing open)", e);
    return false;
  }
}

export async function recordFailure(...keys: string[]) {
  if (!URL_ || !TOKEN) return keys.forEach((k) => recent(k).push(Date.now()));
  try {
    await redis(keys.flatMap((k) => [["INCR", `rl:${k}`], ["EXPIRE", `rl:${k}`, WINDOW_S, "NX"]]));
  } catch (e) {
    console.error("rate limit store unavailable", e);
  }
}

export async function clearFailures(...keys: string[]) {
  if (!URL_ || !TOKEN) return keys.forEach((k) => mem.delete(k));
  try {
    await redis(keys.map((k) => ["DEL", `rl:${k}`]));
  } catch (e) {
    console.error("rate limit store unavailable", e);
  }
}
