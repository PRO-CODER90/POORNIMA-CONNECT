import bcrypt from "bcryptjs";
import { after } from "next/server";
import { clientIp, fail, readJson } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/mail";
import { clearHits, isLimited, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { createToken } from "@/lib/tokens";
import { findByEnrollment, maskEmail } from "@/lib/users";

// A valid bcrypt hash (cost 12) compared against for unknown users, so timing doesn't reveal who exists.
const DUMMY_HASH = "$2b$12$fSSl.kpupFF3XQBZ8frM9./ZyIiiMcvX9wP3cBvR9ejtyhU2Y41.q";

// The role is NOT sent by the client: it comes from the matched record.
export async function POST(req: Request) {
  const body = await readJson(req);
  const enr = String(body.enrollmentNo ?? "").trim();
  const password = typeof body.password === "string" ? body.password : "";

  if (!enr || !password) return fail("MISSING_FIELDS");
  if (!/^\d{1,20}$/.test(enr)) return fail("INVALID_ENROLLMENT_FORMAT");

  // Per IP+enrollment and per enrollment, so spoofed IPs can't brute-force one account.
  const keys = [`ipenr:${clientIp(req)}:${enr}`, `enr:${enr}`];
  if (await isLimited(keys)) return fail("TOO_MANY_ATTEMPTS");

  const user = await findByEnrollment(enr);

  if (user && !user.password_hash) {
    // New user: prove email ownership before a password can be set (otherwise anyone who knows
    // an enrollment number could claim the account first).
    const mailKeys = [`setupmail:${enr}`, `setupmail-ip:${clientIp(req)}`];
    if (await isLimited(mailKeys, MAIL_LIMIT)) return fail("TOO_MANY_REQUESTS");
    await recordHit(mailKeys, MAIL_LIMIT);
    try {
      const raw = await createToken(user.id, "setup");
      await sendEmail(user.email, "setup", user.name, `${appUrl()}/?setup=${raw}`);
    } catch (e) {
      console.error("setup email failed", e);
      return fail("EMAIL_SEND_FAILED");
    }
    const masked = maskEmail(user.email);
    return fail("SETUP_REQUIRED_EMAIL", {
      maskedEmail: masked,
      message: `Welcome! We've sent a secure link to ${masked} to set your password.`,
    });
  }

  const matches = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);
  if (!user || !matches) {
    await recordHit(keys);
    return fail("INVALID_CREDENTIALS");
  }
  after(() => clearHits(keys));
  return startSession(user);
}
