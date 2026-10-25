import { describe, it, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { checkLock, clearAttempts, loginKeys, reserveAttempt, ipKey } from "../src/lib/loginGuard.ts";

// The real SQL runs against an in-process Postgres; the DB clock is moved by editing the stored timestamps.
let pg;
const db = {
  query: async (text, params = []) => (await pg.query(text, params)).rows,
  tx: (fn) => pg.transaction((t) => fn(async (text, params = []) => (await t.query(text, params)).rows)),
};
const schema = fs.readFileSync(new URL("../scripts/schema.sql", import.meta.url), "utf8");

/** Moves every stored timestamp back by `s` seconds, i.e. time passes. */
const advance = (s) =>
  pg.query(
    `UPDATE login_attempts SET window_start = window_start - make_interval(secs => $1::float8),
       updated_at = updated_at - make_interval(secs => $1::float8),
       locked_until = locked_until - make_interval(secs => $1::float8)`,
    [s],
  );

// Mirrors the login route: check, reserve, then "verify the password".
async function attempt(keys, correct = false) {
  const lock = await checkLock(keys, db);
  if (lock.locked) return { status: 429, ...lock };
  const g = await reserveAttempt(keys, db);
  if (g.locked) return { status: 429, ...g };
  if (correct) {
    await clearAttempts(keys.slice(0, 2), db);
    return { status: 200 };
  }
  if (g.lockStarted) return { status: 429, ...g };
  return { status: 401, attemptsLeft: g.attemptsLeft };
}

describe("login guard (3 attempts, escalating lock)", () => {
  before(async () => {
    pg = new PGlite();
    // Only the limiter tables: later sections (contact form, users columns) need tables not created here.
    await pg.exec(schema.slice(schema.indexOf("-- Login attempt limiter"), schema.indexOf("-- Contact form messages")));
  });
  beforeEach(() => pg.exec("DELETE FROM login_attempts"));

  it("reports attempts left, then locks on the 3rd failure for ~5 min", async () => {
    const k = loginKeys("1.1.1.1", "20070");
    assert.deepEqual(await attempt(k), { status: 401, attemptsLeft: 2 });
    assert.deepEqual(await attempt(k), { status: 401, attemptsLeft: 1 });
    const third = await attempt(k);
    assert.equal(third.status, 429);
    assert.ok(third.retryAfterS >= 299 && third.retryAfterS <= 300);
    const fourth = await attempt(k);
    assert.equal(fourth.status, 429);
    assert.ok(fourth.retryAfterS <= 300);
  });

  it("10 parallel wrong attempts: exactly 3 evaluated, the rest locked", async () => {
    const k = loginKeys("2.2.2.2", "20070");
    const out = await Promise.all(Array.from({ length: 10 }, () => attempt(k)));
    assert.equal(out.filter((r) => r.status === 401).length, 2);
    assert.equal(out.filter((r) => r.status === 429).length, 8); // 3rd evaluated attempt starts the lock
  });

  it("unknown and real IDs are counted identically", async () => {
    const a = [await attempt(loginKeys("3.3.3.3", "20070")), await attempt(loginKeys("3.3.3.3", "20070"))];
    const b = [await attempt(loginKeys("4.4.4.4", "99999")), await attempt(loginKeys("4.4.4.4", "99999"))];
    assert.deepEqual(a, b);
  });

  it("a correct password on attempt 3 succeeds and clears the counter", async () => {
    const k = loginKeys("5.5.5.5", "20070");
    await attempt(k);
    await attempt(k);
    assert.equal((await attempt(k, true)).status, 200);
    assert.deepEqual(await attempt(k), { status: 401, attemptsLeft: 2 });
  });

  it("after the lock expires counting restarts and the second lock is 15 min", async () => {
    const k = loginKeys("6.6.6.6", "20070");
    for (let i = 0; i < 3; i++) await attempt(k);
    assert.equal((await attempt(k)).status, 429);
    await advance(301);
    assert.deepEqual(await attempt(k), { status: 401, attemptsLeft: 2 });
    await attempt(k);
    const second = await attempt(k);
    assert.equal(second.status, 429);
    assert.ok(second.retryAfterS > 800 && second.retryAfterS <= 900);
  });

  it("another IP can still try the same ID until the account-wide ceiling (10)", async () => {
    for (let i = 0; i < 3; i++) await attempt(loginKeys("7.7.7.1", "20070"));
    assert.equal((await attempt(loginKeys("7.7.7.1", "20070"))).status, 429);
    assert.equal((await attempt(loginKeys("7.7.7.2", "20070"))).status, 401);
    for (let ip = 3; ip < 9; ip++) for (let i = 0; i < 2; i++) await attempt(loginKeys(`7.7.7.${ip}`, "20070"));
    // 3 + 1 + 12 failures counted against the ID: the ceiling has locked it for everyone.
    assert.equal((await attempt(loginKeys("7.7.7.99", "20070"))).status, 429);
  });

  it("a locked key does not count further attempts", async () => {
    const k = loginKeys("8.8.8.8", "20070");
    for (let i = 0; i < 3; i++) await attempt(k);
    for (let i = 0; i < 5; i++) await attempt(k);
    const [row] = (await pg.query(`SELECT fails, strikes FROM login_attempts WHERE key = $1`, [k[0].key])).rows;
    assert.equal(row.fails, 0);
    assert.equal(row.strikes, 1);
  });

  it("fails closed: a database error propagates instead of allowing the login", async () => {
    const broken = { query: async () => { throw new Error("db down"); }, tx: async () => { throw new Error("db down"); } };
    await assert.rejects(checkLock(loginKeys("9.9.9.9", "1"), broken));
    await assert.rejects(reserveAttempt(loginKeys("9.9.9.9", "1"), broken));
  });

  it("per-IP ceiling locks an IP after 60 failures across IDs", async () => {
    const out = [];
    for (let i = 0; i < 61; i++) out.push(await attempt([...loginKeys("10.0.0.1", `ID${i}`)]));
    assert.equal(out[59].status, 429);
    assert.equal((await checkLock([ipKey("10.0.0.1")], db)).locked, true);
  });
});
