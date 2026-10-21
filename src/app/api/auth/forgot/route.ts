import { clientIp, fail, guardPost, ok, readJson, withErrors } from "@/lib/api";
import { sendEmail } from "@/lib/mail";
import { FORGOT_LIMIT, isLimited, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { createTempPassword } from "@/lib/tokens";
import { findByEmailOrEnrollment } from "@/lib/users";

// Every reply takes at least this long, so response time doesn't reveal whether the account exists
// (looking it up and sending an email takes longer than finding nothing).
const MIN_RESPONSE_MS = 2500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NEUTRAL =
  "If this account exists, your login ID and a temporary password have been sent to the registered email. The temporary password expires in 30 minutes.";

export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const { identifier } = await readJson(req);
  const id = typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
  if (!id || id.length > 200) return fail("MISSING_FIELDS");

  const ipKey = [`forgot:${clientIp(req)}`];
  if (await isLimited(ipKey, FORGOT_LIMIT)) return fail("TOO_MANY_REQUESTS");
  await recordHit(ipKey, FORGOT_LIMIT);

  // The work runs BEFORE replying (work scheduled after the response was not reliably executed on
  // Vercel). The reply is the same in every case; the real outcome goes to the server log only.
  const started = Date.now();
  try {
    const user = await findByEmailOrEnrollment(id);
    if (!user) {
      console.info("[forgot] skipped: no matching account");
    } else if (!user.password_hash) {
      // Only accounts that already have a password. New users activate through sign-in
      // (enrollment route or Google), which proves they own the email.
      console.info(`[forgot] skipped: user ${user.id} has not set a password yet`);
    } else if (await isLimited([`forgotmail:${user.id}`], MAIL_LIMIT)) {
      console.info(`[forgot] skipped: user ${user.id} reached the hourly email limit`);
    } else {
      await recordHit([`forgotmail:${user.id}`], MAIL_LIMIT);
      // Login ID + a one-time temporary password, sent only to the email on record. The current
      // password keeps working, so a stranger requesting this can't lock the owner out.
      const temp = await createTempPassword(user.id);
      await sendEmail(user.email, "temp", { name: user.name, loginId: user.enrollment_no, tempPassword: temp });
      console.info(`[forgot] sent login details to user ${user.id}`);
    }
  } catch (e) {
    console.error("[forgot] email failed", e);
  }
  const remaining = MIN_RESPONSE_MS - (Date.now() - started);
  if (remaining > 0) await sleep(remaining);
  return ok({ message: NEUTRAL });
});
