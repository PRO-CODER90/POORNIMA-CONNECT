import { after } from "next/server";
import { clientIp, fail, ok, readJson, withErrors } from "@/lib/api";
import { appUrl, sendEmail } from "@/lib/mail";
import { FORGOT_LIMIT, isLimited, MAIL_LIMIT, recordHit } from "@/lib/rateLimit";
import { createToken } from "@/lib/tokens";
import { findByEmailOrEnrollment } from "@/lib/users";

const NEUTRAL = "If this account exists, a link has been sent to the registered email. It expires in 30 minutes.";

export const POST = withErrors(async (req: Request) => {
  const { identifier } = await readJson(req);
  const id = typeof identifier === "string" ? identifier.trim().toLowerCase() : "";
  if (!id || id.length > 200) return fail("MISSING_FIELDS");

  const ipKey = [`forgot:${clientIp(req)}`];
  if (await isLimited(ipKey, FORGOT_LIMIT)) return fail("TOO_MANY_REQUESTS");
  await recordHit(ipKey, FORGOT_LIMIT);

  // Lookup, token and email run after the response is sent, so response time is identical whether or
  // not the account exists. The reply never says which, and email failures are logged, not shown
  // (showing them would reveal that the account exists).
  const base = appUrl();
  after(async () => {
    try {
      const user = await findByEmailOrEnrollment(id);
      // Reset links go only to accounts that already have a password. New users activate through
      // sign-in (enrollment route or Google), which proves they own the email.
      if (!user || !user.password_hash) return;
      const mailKey = [`forgotmail:${user.id}`];
      if (await isLimited(mailKey, MAIL_LIMIT)) return;
      await recordHit(mailKey, MAIL_LIMIT);
      const raw = await createToken(user.id, "reset");
      await sendEmail(user.email, "reset", user.name, `${base}/?reset=${raw}`);
    } catch (e) {
      console.error("forgot-password email failed", e);
    }
  });
  return ok({ message: NEUTRAL });
});
