import { clientIp, fail, guardPost, ok, readJson, withErrors } from "@/lib/api";
import { appUrl, sendAdminRecoveryNotification, sendEmail } from "@/lib/mail";
import { FORGOT_LIMIT, isLimited, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { createToken } from "@/lib/tokens";
import { findByEmailOrEnrollment, maskEmail } from "@/lib/users";

// Every reply takes at least this long, so response time doesn't reveal whether the account exists
// (looking it up and sending an email takes longer than finding nothing).
const MIN_RESPONSE_MS = 2500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const NEUTRAL =
  "If this account exists, password reset instructions have been sent to the registered email. The link expires in 30 minutes.";

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
    const isEmail = id.includes("@");
    const user = await findByEmailOrEnrollment(id);
    if (!user) {
      const hint = isEmail ? `email domain @${id.split("@")[1] || "unknown"}` : `enrollment (len: ${id.length})`;
      console.info(`[forgot] skipped: no matching account (${hint})`);
    } else if (!user.password_hash) {
      // Only accounts that already have a password. New users activate through sign-in
      // (enrollment route or Google), which proves they own the email.
      console.info(`[forgot] skipped: user ${user.id} has not set a password yet`);
    } else if (await isLimited([`forgotmail:${user.id}`], MAIL_LIMIT)) {
      console.info(`[forgot] skipped: user ${user.id} reached the hourly email limit`);
    } else {
      await recordHit([`forgotmail:${user.id}`], MAIL_LIMIT);
      // Generate a secure one-time reset link using the existing auth_tokens table.
      const rawToken = await createToken(user.id, "reset");
      const resetUrl = `${appUrl()}/?reset=${rawToken}`;
      await sendEmail(user.email, "reset", {
        name: user.name,
        link: resetUrl,
      });
      console.info(`[forgot] sent reset link to user ${user.id}`);

      // Optional admin notification for account recovery events
      if (process.env.ADMIN_EMAIL) {
        try {
          await sendAdminRecoveryNotification({
            identifier: `${user.enrollment_no} (${maskEmail(user.email)})`,
            timestamp: new Date(),
          });
        } catch (adminErr) {
          console.error("[forgot] admin notification failed", adminErr instanceof Error ? adminErr.message : "unknown error");
        }
      }
    }
  } catch (e) {
    console.error("[forgot] email failed", e instanceof Error ? e.message : "unknown error");
  }
  const remaining = MIN_RESPONSE_MS - (Date.now() - started);
  if (remaining > 0) await sleep(remaining);
  return ok({ message: NEUTRAL });
});
