import bcrypt from "bcryptjs";
import { clientIp, fail, guardPost, readJson, withErrors } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/mail";
import { clearHits, isLimited, LOGIN_IP_LIMIT, LOGIN_LIMIT, MAIL_IP_LIMIT, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { consumeTempPassword, createToken, TTL } from "@/lib/tokens";
import { findByEnrollment, maskEmail } from "@/lib/users";

// A valid bcrypt hash (cost 12) compared against for unknown users, so timing doesn't reveal who exists.
const DUMMY_HASH = "$2b$12$fSSl.kpupFF3XQBZ8frM9./ZyIiiMcvX9wP3cBvR9ejtyhU2Y41.q";

// The role is NOT sent by the client: it comes from the matched record.
export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const body = await readJson(req);
  const enr = String(body.enrollmentNo ?? "").trim();
  const password = typeof body.password === "string" ? body.password : "";

  if (!enr || !password) return fail("MISSING_FIELDS");
  if (!/^\d{1,12}$/.test(enr)) return fail("INVALID_ENROLLMENT_FORMAT");

  // Per IP+enrollment and per enrollment, so spoofed IPs can't brute-force one account.
  const ip = clientIp(req);
  const keys = [`ipenr:${ip}:${enr}`, `enr:${enr}`];
  const ipKey = [`ipfail:${ip}`];
  if ((await isLimited(keys, LOGIN_LIMIT)) || (await isLimited(ipKey, LOGIN_IP_LIMIT))) return fail("TOO_MANY_ATTEMPTS");
  if (password.length > 64) {
    // Longer than any password we accept: don't spend bcrypt time on it.
    await recordHit(keys, LOGIN_LIMIT);
    await recordHit(ipKey, LOGIN_IP_LIMIT);
    return fail("INVALID_CREDENTIALS");
  }

  const user = await findByEnrollment(enr);

  if (user && !user.password_hash) {
    // New user: prove email ownership before a password can be set (otherwise anyone who knows
    // an enrollment number could claim the account first).
    const mailKey = [`setupmail:${enr}`];
    const mailIpKey = [`setupmail-ip:${ip}`];
    if ((await isLimited(mailKey, MAIL_LIMIT)) || (await isLimited(mailIpKey, MAIL_IP_LIMIT))) return fail("TOO_MANY_REQUESTS");
    await recordHit(mailKey, MAIL_LIMIT);
    await recordHit(mailIpKey, MAIL_IP_LIMIT);
    try {
      const raw = await createToken(user.id, "setup");
      await sendEmail(user.email, "setup", { name: user.name, loginId: user.enrollment_no, link: `${appUrl()}/?setup=${raw}` });
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

  // Not the real password: maybe the temporary one from forgot-password. It's single-use, so it
  // never opens a session; it only lets the user choose a new password right away.
  if (user && !matches && (await consumeTempPassword(user.id, password))) {
    await clearHits(keys);
    const changeToken = await createToken(user.id, "setup", TTL.passwordChange);
    return fail("PASSWORD_CHANGE_REQUIRED", { changeToken, name: user.name });
  }

  if (!user || !matches) {
    await recordHit(keys, LOGIN_LIMIT);
    await recordHit(ipKey, LOGIN_IP_LIMIT);
    return fail("INVALID_CREDENTIALS");
  }
  await clearHits(keys); // per-account counters only; the per-IP counter keeps running
  return startSession(user);
});
