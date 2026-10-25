import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { submitContact, MIN_FILL_MS } from "../src/lib/contact.ts";
import { contactMail } from "../src/lib/mail.ts";

const NOW = 1_800_000_000_000;
let stored, sent, marked, hits, limitedReturns, sendFails;

const deps = () => ({
  limited: async () => limitedReturns,
  hit: async (ip) => void hits.push(ip),
  store: async (m) => {
    stored.push(m);
    return "1a2b3c4d-0000-0000-0000-000000000000";
  },
  markSent: async (id) => void marked.push(id),
  send: async (m) => {
    if (sendFails) throw new Error("smtp down");
    sent.push(m);
  },
  secret: "s",
  now: () => NOW,
});

const valid = { name: "Asha Verma", email: "Asha@Example.com", subject: "Order issue", message: "My order PU-C1 never arrived.", consent: true, website: "", ts: NOW - 10_000 };
const post = (body, headers = {}) =>
  new Request("http://localhost/api/contact", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", host: "localhost", "x-real-ip": "9.9.9.9", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

describe("contact form", () => {
  beforeEach(() => {
    stored = [];
    sent = [];
    marked = [];
    hits = [];
    limitedReturns = false;
    sendFails = false;
  });

  it("stores, emails and returns a reference for a valid message", async () => {
    const r = await submitContact(post(valid), deps());
    assert.equal(r.status, 200);
    assert.deepEqual(await r.json(), { success: true, reference: "CM-1A2B3C4D" });
    assert.equal(stored.length, 1);
    assert.equal(stored[0].email, "asha@example.com");
    assert.notEqual(stored[0].ipHash, "9.9.9.9", "raw IP is never stored");
    assert.equal(sent.length, 1);
    assert.deepEqual(marked, ["1a2b3c4d-0000-0000-0000-000000000000"]);
  });

  it("returns field errors for missing fields", async () => {
    const r = await submitContact(post({ ...valid, name: "", subject: "Spam", consent: false }), deps());
    assert.equal(r.status, 400);
    const d = await r.json();
    assert.ok(d.fields.name && d.fields.subject && d.fields.consent);
    assert.equal(stored.length, 0);
  });

  it("silently drops honeypot and too-fast submissions", async () => {
    for (const body of [{ ...valid, website: "http://spam" }, { ...valid, ts: NOW - (MIN_FILL_MS - 1) }]) {
      const r = await submitContact(post(body), deps());
      assert.equal(r.status, 200);
      assert.equal((await r.json()).success, true);
    }
    assert.equal(stored.length + sent.length, 0);
  });

  it("answers 429 when the limiter says so (and never stores)", async () => {
    limitedReturns = true;
    const r = await submitContact(post(valid), deps());
    assert.equal(r.status, 429);
    assert.equal(stored.length, 0);
  });

  it("refuses a cross-site Origin and non-JSON bodies", async () => {
    assert.equal((await submitContact(post(valid, { origin: "https://evil.example" }), deps())).status, 403);
    assert.equal((await submitContact(post(valid, { "content-type": "text/plain" }), deps())).status, 415);
    assert.equal((await submitContact(post("x".repeat(9000)), deps())).status, 413);
  });

  it("still succeeds and keeps the message when SMTP fails", async () => {
    sendFails = true;
    const r = await submitContact(post(valid), deps());
    assert.equal(r.status, 200);
    assert.equal(stored.length, 1);
    assert.equal(marked.length, 0, "email_sent stays false");
  });

  it("strips CR/LF from name and subject and escapes HTML in the email", () => {
    const m = contactMail("to@x.in", "from@x.in", {
      name: "Eve\r\nBcc: victim@x.in",
      email: "eve@x.in",
      subject: "Hi\nBcc: a@b.c",
      message: "<script>alert(1)</script>",
      reference: "CM-1",
    });
    assert.ok(!/[\r\n]/.test(m.subject) && !/[\r\n]/.test(m.replyTo.name));
    assert.equal(m.from, "from@x.in", "never sent from the visitor's address");
    assert.equal(m.replyTo.address, "eve@x.in");
    assert.ok(!m.html.includes("<script>"));
    assert.ok(m.html.includes("&#60;script&#62;"));
  });
});

describe("contact rate limit", () => {
  it("allows 3 messages an hour per IP; the 4th is limited", async () => {
    const { isLimited, recordHit, CONTACT_IP_LIMIT } = await import("../src/lib/rateLimit.ts");
    const key = [`contact-ip:test-${Date.now()}`];
    for (let i = 0; i < 3; i++) {
      assert.equal(await isLimited(key, CONTACT_IP_LIMIT, { failClosed: true }), false);
      await recordHit(key, CONTACT_IP_LIMIT);
    }
    assert.equal(await isLimited(key, CONTACT_IP_LIMIT, { failClosed: true }), true);
  });
});
