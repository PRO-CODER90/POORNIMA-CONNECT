import bcrypt from "bcryptjs";
import { after } from "next/server";
import { clientIp, fail, ok, readJson } from "@/lib/api";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { checkPasswordPolicy } from "@/lib/password";
import { FORGOT_LIMIT, isLimited, recordHit } from "@/lib/rateLimit";
import { findValidToken } from "@/lib/tokens";
import { findById } from "@/lib/users";

// Used for both "reset" and first-time "setup".
export async function POST(req: Request) {
  const { token, password, confirmPassword } = await readJson(req);
  if (typeof password !== "string" || typeof confirmPassword !== "string") return fail("MISSING_FIELDS");

  const ipKey = [`reset:${clientIp(req)}`];
  if (await isLimited(ipKey, FORGOT_LIMIT)) return fail("TOO_MANY_REQUESTS");

  const t = await findValidToken(token);
  if (!t) {
    await recordHit(ipKey, FORGOT_LIMIT); // only bad links count, so typos in the password never lock anyone out
    return fail("LINK_INVALID");
  }
  if (password !== confirmPassword) return fail("PASSWORD_MISMATCH");

  const user = await findById(t.user_id);
  if (!user) return fail("LINK_INVALID");
  const problem = checkPasswordPolicy(password, user.email, user.enrollment_no);
  if (problem) return fail(problem);
  if (user.password_hash && (await bcrypt.compare(password, user.password_hash))) return fail("PASSWORD_REUSED");

  const hash = await bcrypt.hash(password, 12);

  // One transaction: claim the token (atomic, so a double submit can't use it twice), store the
  // password, burn every other token, and bump token_version to end all old sessions.
  const done = await getDb().begin(async (tx) => {
    const claimed = await tx`UPDATE auth_tokens SET used_at = now()
                              WHERE id = ${t.id} AND used_at IS NULL AND expires_at > now() RETURNING id`;
    if (claimed.length === 0) return false;
    await tx`UPDATE users SET password_hash = ${hash}, password_set_at = now(),
                    token_version = token_version + 1 WHERE id = ${t.user_id}`;
    await tx`UPDATE auth_tokens SET used_at = now() WHERE user_id = ${t.user_id} AND used_at IS NULL`;
    return true;
  });
  if (!done) return fail("LINK_INVALID");

  after(() =>
    sendEmail(user.email, "changed", user.name).catch((e) => console.error("password-changed email failed", e)),
  );
  return ok({ message: "Password set successfully. Please sign in." }); // no auto-login
}
