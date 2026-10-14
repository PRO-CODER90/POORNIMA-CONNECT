// In-memory limiter: 5 failures / 10 min per key. Use a shared store (Redis)
// if the app runs on more than one instance.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILS = 5;
const fails = new Map<string, number[]>();

function recent(key: string) {
  const now = Date.now();
  const list = (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  fails.set(key, list);
  return list;
}

export const isLimited = (key: string) => recent(key).length >= MAX_FAILS;
export const recordFailure = (key: string) => void recent(key).push(Date.now());
export const clearFailures = (key: string) => void fails.delete(key);

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
