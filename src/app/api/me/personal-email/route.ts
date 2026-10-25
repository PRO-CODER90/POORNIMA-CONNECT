import bcrypt from "bcryptjs";
import { fail, guardPost, ok, readJson, withErrors } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { sendEmail } from "@/lib/mail";
import { findById } from "@/lib/users";

/**
 * Sets (or clears) the personal email that also receives password-reset links. The current
 * password is required, so a borrowed or stolen session cannot quietly add its own recovery
 * address, and the university email is told about every change.
 */
export const PATCH = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const s = await getSession();
  if (!s) return fail("SESSION_EXPIRED");
  const user = await findById(s.uid);
  if (!user) return fail("SESSION_EXPIRED");

  const body = await readJson(req);
  const raw = typeof body.personalEmail === "string" ? body.personalEmail.trim().toLowerCase() : "";
  const password = typeof body.currentPassword === "string" ? body.currentPassword : "";

  if (raw && (raw.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw))) {
    return Response.json({ success: false, message: "Enter a valid email address." }, { status: 400 });
  }
  if (raw && raw === user.email) {
    return Response.json({ success: false, message: "That is already your university email. Add a different, personal address." }, { status: 400 });
  }
  if (user.password_hash && !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json({ success: false, message: "Your current password is not correct." }, { status: 403 });
  }

  const next = raw || null;
  if (next === user.personal_email) return ok({ personalEmail: next });
  await getDb()`UPDATE users SET personal_email = ${next} WHERE id = ${user.id}`;
  try {
    await sendEmail(user.email, "recovery", { name: user.name });
  } catch (e) {
    console.error("[personal-email] change notice failed", e instanceof Error ? e.message : "unknown error");
  }
  return ok({ personalEmail: next });
});
