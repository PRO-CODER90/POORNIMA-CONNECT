import { after } from "next/server";
import { clientIp, fail, guardPost, ok, readJson, withErrors } from "@/lib/api";
import { sendEmail } from "@/lib/mail";
import { FORGOT_LIMIT, isLimited, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { createTempPassword } from "@/lib/tokens";
import { findByEmailOrEnrollment } from "@/lib/users";

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

  // Lookup, token and email run after the response is sent, so response time is identical whether or
  // not the account exists. The reply never says which, and email failures are logged, not shown
  // (showing them would reveal that the account exists).
  after(async () => {
    try {
      const user = await findByEmailOrEnrollment(id);
      // Only accounts that already have a password. New users activate through sign-in
      // (enrollment route or Google), which proves they own the email.
      if (!user || !user.password_hash) return;
      const mailKey = [`forgotmail:${user.id}`];
      if (await isLimited(mailKey, MAIL_LIMIT)) return;
      await recordHit(mailKey, MAIL_LIMIT);
      // Login ID + a one-time temporary password, sent only to the email on record. The current
      // password keeps working, so a stranger requesting this can't lock the owner out.
      const temp = await createTempPassword(user.id);
      await sendEmail(user.email, "temp", { name: user.name, loginId: user.enrollment_no, tempPassword: temp });
    } catch (e) {
      console.error("forgot-password email failed", e);
    }
  });
  return ok({ message: NEUTRAL });
});
