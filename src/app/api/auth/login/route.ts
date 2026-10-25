import bcrypt from "bcryptjs";
import { clientIp, fail, guardPost, readJson, withErrors } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/mail";
import { checkLock, clearAttempts, logLoginEvent, loginKeys, reserveAttempt, type GuardState } from "@/lib/loginGuard";
import { isLimited, MAIL_IP_LIMIT, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { consumeTempPassword, createToken, TTL } from "@/lib/tokens";
import { findByEnrollment, maskEmail } from "@/lib/users";

// A valid bcrypt hash (cost 12) compared against for unknown users, so timing doesn't reveal who exists.
const DUMMY_HASH = "$2b$12$fSSl.kpupFF3XQBZ8frM9./ZyIiiMcvX9wP3cBvR9ejtyhU2Y41.q";

// The role is NOT sent by the client: it comes from the matched record.
export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const body = await readJson(req);
  const enr = String(body.enrollmentNo ?? "").trim().toUpperCase(); // staff IDs like STF001; student IDs are digits
  const password = typeof body.password === "string" ? body.password : "";

  if (!enr || !password) return fail("MISSING_FIELDS");
  if (!/^[A-Z0-9]{1,12}$/.test(enr)) return fail("INVALID_ENROLLMENT_FORMAT");

  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent");
  const keys = loginKeys(ip, enr);
  const locked = (g: GuardState) =>
    fail(
      "ACCOUNT_LOCKED",
      { retryAfterSeconds: g.retryAfterS, lockedUntil: g.lockedUntil },
      { "Retry-After": String(g.retryAfterS) },
    );

  // Fail closed: if the limiter's database is unreachable this throws and withErrors answers SERVER_ERROR
  // without ever checking the password. Locked: don't spend bcrypt time at all.
  const lock = await checkLock(keys);
  if (lock.locked) {
    await logLoginEvent({ loginId: enr, ip, outcome: "LOCKED", userAgent });
    return locked(lock);
  }
  // Count the attempt BEFORE checking the password, so parallel guesses can't exceed the limit.
  const g = await reserveAttempt(keys);
  if (g.locked) {
    await logLoginEvent({ loginId: enr, ip, outcome: "LOCKED", userAgent });
    return locked(g);
  }
  // Wrong password: the lock this attempt started (if any) or the attempts left.
  const failed = async () => {
    if (g.lockStarted) {
      await logLoginEvent({ loginId: enr, ip, outcome: "LOCK_STARTED", userAgent });
      return locked(g);
    }
    await logLoginEvent({ loginId: enr, ip, outcome: "BAD_CREDENTIALS", userAgent });
    return fail("INVALID_CREDENTIALS", { attemptsLeft: g.attemptsLeft });
  };
  if (password.length > 64) return failed(); // longer than any password we accept: don't spend bcrypt time

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
      console.error("setup email failed", e instanceof Error ? e.message : "unknown error");
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
    await clearAttempts(keys.slice(0, 2));
    const changeToken = await createToken(user.id, "setup", TTL.passwordChange);
    return fail("PASSWORD_CHANGE_REQUIRED", { changeToken, name: user.name });
  }

  if (!user || !matches) return failed();
  await clearAttempts(keys.slice(0, 2)); // ie + id counters only; the per-IP ceiling keeps running
  await logLoginEvent({ loginId: enr, ip, outcome: "SUCCESS", userAgent });
  return startSession(user);
});
