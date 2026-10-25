// Contact form: one schema for the browser form and the API, plus the request handler. The
// handler takes its storage, mailer and rate limiter as arguments so the tests can run it.
import { createHash } from "node:crypto";
import { clientIp, guardPost } from "@/lib/api";
import type { ContactMail } from "@/lib/mail";
import { parseContact, type ContactInput } from "@/lib/contact-schema";

export { SUBJECTS, parseContact } from "@/lib/contact-schema";

export const MIN_FILL_MS = 3000;
const MAX_BODY = 8 * 1024;

export interface ContactDeps {
  /** Rate-limit check; must fail CLOSED (return true) if its store is down. */
  limited: (ipKey: string, emailKey: string) => Promise<boolean>;
  hit: (ipKey: string, emailKey: string) => Promise<void>;
  store: (m: ContactInput & { ipHash: string; userAgent: string }) => Promise<string>;
  markSent: (id: string) => Promise<void>;
  send: (m: ContactMail) => Promise<void>;
  secret: string;
  now?: () => number;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function submitContact(req: Request, deps: ContactDeps): Promise<Response> {
  const refused = guardPost(req);
  if (refused) return refused;
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return json({ error: "Your message is too long." }, 413);
  const text = await req.text().catch(() => "");
  if (text.length > MAX_BODY) return json({ error: "Your message is too long." }, 413);
  let raw: Record<string, unknown> = {};
  try {
    raw = JSON.parse(text);
  } catch {
    return json({ error: "Invalid request." }, 400);
  }

  // Bots: a filled honeypot or a form sent faster than a person can type gets a normal-looking
  // reply and nothing else, so they learn nothing.
  const now = (deps.now ?? Date.now)();
  const ts = Number(raw.ts);
  if ((typeof raw.website === "string" && raw.website !== "") || !Number.isFinite(ts) || now - ts < MIN_FILL_MS) {
    return json({ success: true, reference: "CM-" + createHash("sha256").update(String(now)).digest("hex").slice(0, 8).toUpperCase() });
  }

  const p = parseContact(raw);
  if (!p.ok) return json({ error: Object.values(p.errors)[0], fields: p.errors }, 400);
  const m = p.value;

  const ip = clientIp(req);
  const ipKey = `contact-ip:${ip}`;
  const emailKey = `contact-email:${m.email}`;
  if (await deps.limited(ipKey, emailKey)) {
    return json({ error: "You've sent several messages already. Please try again later, or email us directly." }, 429);
  }
  await deps.hit(ipKey, emailKey);

  // Store first, so the message survives an email outage.
  const ipHash = createHash("sha256").update(`${ip}|${deps.secret}`).digest("hex");
  const id = await deps.store({ ...m, ipHash, userAgent: (req.headers.get("user-agent") ?? "").slice(0, 300) });
  const reference = "CM-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();
  try {
    await deps.send({ name: m.name, email: m.email, subject: m.subject, message: m.message, reference });
    await deps.markSent(id);
  } catch (e) {
    console.error("[contact] email failed; message is stored", e instanceof Error ? e.message : e);
  }
  return json({ success: true, reference });
}
