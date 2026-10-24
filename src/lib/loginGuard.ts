// Password sign-in limiter, stored in Postgres (login_attempts, scripts/schema.sql) so every server
// instance shares it and each update is atomic. Times come from the database clock (now()), never
// Date.now(), so instances can't disagree.
//
// An attempt is RESERVED before the password is checked and refunded on success: N parallel guesses
// can never exceed the limit. Any database error propagates, so the login is refused (fails closed).
import { getDb } from "@/lib/db";

export const MAX_ATTEMPTS = 3;
export const WINDOW_S = 15 * 60;
export const LOCK_STEPS_S = [300, 900, 1800, 3600]; // 5m, 15m, 30m, 60m
export const STRIKE_DECAY_S = 24 * 3600;

export interface KeyPolicy {
  max: number;
  windowS: number;
  lockStepsS: number[];
}

export const POLICY = {
  /** login ID + IP: the "3 attempts" rule, escalating lockouts. */
  ie: { max: MAX_ATTEMPTS, windowS: WINDOW_S, lockStepsS: LOCK_STEPS_S },
  /** one login ID across all IPs: stops distributed guessing without letting anyone lock a student out by typing their ID. */
  id: { max: 10, windowS: 30 * 60, lockStepsS: [15 * 60] },
  /** one IP across all IDs: kept high because many students share the campus NAT. */
  ip: { max: 60, windowS: 15 * 60, lockStepsS: [15 * 60] },
} satisfies Record<string, KeyPolicy>;

export interface GuardKey {
  key: string;
  policy: KeyPolicy;
}

export const ipKey = (ip: string): GuardKey => ({ key: `ip:${ip}`, policy: POLICY.ip });

/** Keys for one password attempt. Unknown IDs get exactly the same keys as real ones. */
export function loginKeys(ip: string, loginId: string): GuardKey[] {
  return [
    { key: `ie:${ip}:${loginId}`, policy: POLICY.ie },
    { key: `id:${loginId}`, policy: POLICY.id },
    ipKey(ip),
  ];
}

export interface GuardState {
  locked: boolean;
  retryAfterS: number;
  /** Epoch ms (database clock) when the lock ends; null when not locked. */
  lockedUntil: number | null;
  attemptsLeft: number;
  /** This reservation used the last attempt and started a lock. The attempt itself is still evaluated. */
  lockStarted?: boolean;
}

type Row = Record<string, unknown>;
type Query = (text: string, params?: unknown[]) => Promise<Row[]>;
/** The few database calls the guard needs; tests pass an in-process Postgres. */
export interface GuardDb {
  query: Query;
  tx<T>(fn: (q: Query) => Promise<T>): Promise<T>;
}

function defaultDb(): GuardDb {
  const sql = getDb();
  return {
    query: (text, params = []) => sql.unsafe(text, params as never[]) as unknown as Promise<Row[]>,
    tx: (fn) => sql.begin((t) => fn((text, params = []) => t.unsafe(text, params as never[]) as unknown as Promise<Row[]>)) as never,
  };
}

const placeholders = (n: number, from = 1) => Array.from({ length: n }, (_, i) => `$${i + from}`).join(", ");
// Shared column list: seconds left on the lock and its end time, both from the database clock.
const LOCK_COLS = `locked_until IS NOT NULL AND locked_until > now() AS locked,
  GREATEST(ceil(extract(epoch FROM locked_until - now())), 0)::int AS retry_s,
  (extract(epoch FROM locked_until) * 1000)::float8 AS until_ms`;

const OPEN = (attemptsLeft: number): GuardState => ({ locked: false, retryAfterS: 0, lockedUntil: null, attemptsLeft });

function lockedState(rows: Row[]): GuardState {
  const r = rows.reduce((a, b) => (Number(b.retry_s) > Number(a.retry_s) ? b : a));
  return { locked: true, retryAfterS: Number(r.retry_s), lockedUntil: Number(r.until_ms), attemptsLeft: 0 };
}

/** Read-only: is any of these keys locked right now? */
export async function checkLock(keys: GuardKey[], db: GuardDb = defaultDb()): Promise<GuardState> {
  const rows = await db.query(
    `SELECT ${LOCK_COLS} FROM login_attempts WHERE key IN (${placeholders(keys.length)}) AND locked_until > now()`,
    keys.map((k) => k.key),
  );
  return rows.length ? lockedState(rows) : OPEN(Math.min(...keys.map((k) => k.policy.max)));
}

class AlreadyLocked extends Error {
  rows: Row[];
  constructor(rows: Row[]) {
    super("locked");
    this.rows = rows;
  }
}

/**
 * Atomically counts one attempt against every key (one transaction, keys always in the same order).
 * If any key is already locked nothing is counted and `locked` is true: don't check the password.
 * If this attempt reached a key's limit, the lock starts now (`lockStarted`) but the attempt is still evaluated.
 */
export async function reserveAttempt(keys: GuardKey[], db: GuardDb = defaultDb()): Promise<GuardState> {
  try {
    return await db.tx(async (q) => {
      let left = Infinity;
      let started: Row | null = null;
      for (const { key, policy } of keys) {
        const [r] = await q(
          `INSERT INTO login_attempts AS t (key, fails, window_start, updated_at)
           VALUES ($1, 1, now(), now())
           ON CONFLICT (key) DO UPDATE SET
             fails = CASE
                       WHEN t.locked_until IS NOT NULL AND t.locked_until > now() THEN t.fails
                       WHEN t.window_start < now() - make_interval(secs => $2::float8)
                         OR (t.locked_until IS NOT NULL AND t.locked_until <= now()) THEN 1
                       ELSE t.fails + 1
                     END,
             window_start = CASE
                       WHEN t.locked_until IS NOT NULL AND t.locked_until > now() THEN t.window_start
                       WHEN t.window_start < now() - make_interval(secs => $2::float8)
                         OR (t.locked_until IS NOT NULL AND t.locked_until <= now()) THEN now()
                       ELSE t.window_start
                     END,
             locked_until = CASE WHEN t.locked_until IS NOT NULL AND t.locked_until <= now() THEN NULL ELSE t.locked_until END,
             strikes = CASE WHEN t.updated_at < now() - make_interval(secs => $3::float8) THEN 0 ELSE t.strikes END,
             updated_at = now()
           RETURNING fails, strikes, ${LOCK_COLS}`,
          [key, policy.windowS, STRIKE_DECAY_S],
        );
        if (r.locked) throw new AlreadyLocked([r]); // rolls back the counts made so far
        const fails = Number(r.fails);
        if (fails >= policy.max) {
          const steps = policy.lockStepsS;
          const lockS = steps[Math.min(Number(r.strikes), steps.length - 1)];
          const [l] = await q(
            `UPDATE login_attempts
                SET locked_until = now() + make_interval(secs => $2::float8), strikes = strikes + 1, fails = 0
              WHERE key = $1
              RETURNING ${LOCK_COLS}`,
            [key, lockS],
          );
          if (!started || Number(l.retry_s) > Number(started.retry_s)) started = l;
          left = 0;
        } else left = Math.min(left, policy.max - fails);
      }
      if (started) return { ...lockedState([started]), locked: false, lockStarted: true };
      return OPEN(left);
    });
  } catch (e) {
    if (e instanceof AlreadyLocked) return lockedState(e.rows);
    throw e;
  }
}

/** After a correct password: forget the failures (call with the ie + id keys, not the IP ceiling). */
export async function clearAttempts(keys: GuardKey[], db: GuardDb = defaultDb()): Promise<void> {
  await db.query(`DELETE FROM login_attempts WHERE key IN (${placeholders(keys.length)})`, keys.map((k) => k.key));
}

export type LoginOutcome = "SUCCESS" | "BAD_CREDENTIALS" | "LOCKED" | "LOCK_STARTED" | "GOOGLE_FAIL";

/** Audit trail for Admin → Audit Logs. Best effort: a logging failure never changes the login result. */
export async function logLoginEvent(
  e: { loginId?: string | null; ip: string; outcome: LoginOutcome; userAgent?: string | null },
  db: GuardDb = defaultDb(),
): Promise<void> {
  try {
    await db.query(`INSERT INTO login_events (login_id, ip, outcome, user_agent) VALUES ($1, $2, $3, $4)`, [
      e.loginId ?? null,
      e.ip,
      e.outcome,
      e.userAgent?.slice(0, 300) ?? null,
    ]);
  } catch (err) {
    console.error("[login] could not write login_events:", err instanceof Error ? err.message : err);
  }
}
