import { clientIp, fail, guardPost, readJson, withErrors } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { verifyGoogleIdToken } from "@/lib/google";
import { isLimited, LOGIN_IP_LIMIT, recordHit } from "@/lib/rateLimit";
import { createToken, TTL } from "@/lib/tokens";
import { findByEmail } from "@/lib/users";

export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const key = [`ip:${clientIp(req)}`];
  if (await isLimited(key, LOGIN_IP_LIMIT)) return fail("TOO_MANY_ATTEMPTS");

  let email: string;
  try {
    const { idToken } = await readJson(req);
    if (typeof idToken !== "string" || !idToken) throw new Error("missing token");
    const p = await verifyGoogleIdToken(idToken);
    if (!p.email || p.email_verified !== true) throw new Error("unverified email");
    email = p.email.trim().toLowerCase();
  } catch {
    await recordHit(key, LOGIN_IP_LIMIT);
    return fail("GOOGLE_FAILED");
  }

  if (!email.endsWith("@poornima.edu.in")) {
    await recordHit(key, LOGIN_IP_LIMIT);
    return fail("INVALID_DOMAIN");
  }
  const user = await findByEmail(email);
  if (!user) {
    await recordHit(key, LOGIN_IP_LIMIT);
    return fail("NOT_REGISTERED");
  }

  if (!user.password_hash) {
    // Google already proved the user owns this email, so no email step: hand back a short-lived setup token.
    const setupToken = await createToken(user.id, "setup", TTL.setupGoogle);
    return fail("SETUP_REQUIRED", { setupToken, name: user.name });
  }
  return startSession(user);
});
