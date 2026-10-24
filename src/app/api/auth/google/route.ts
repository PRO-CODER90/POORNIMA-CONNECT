import { clientIp, fail, guardPost, readJson, withErrors } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { GoogleConfigError, verifyGoogleIdToken } from "@/lib/google";
import { logLoginEvent } from "@/lib/loginGuard";
import { isLimited, LOGIN_IP_LIMIT, recordHit } from "@/lib/rateLimit";
import { createToken, TTL } from "@/lib/tokens";
import { findByEmail } from "@/lib/users";

export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const ip = clientIp(req);
  const key = [`ip:${ip}`];
  const ua = req.headers.get("user-agent");
  if (await isLimited(key, LOGIN_IP_LIMIT)) return fail("TOO_MANY_ATTEMPTS");
  const reject = async (code: "GOOGLE_FAILED" | "INVALID_DOMAIN" | "NOT_REGISTERED", loginId?: string) => {
    await recordHit(key, LOGIN_IP_LIMIT);
    await logLoginEvent({ loginId, ip, outcome: "GOOGLE_FAIL", userAgent: ua });
    return fail(code);
  };

  let email: string;
  try {
    const { idToken } = await readJson(req);
    if (typeof idToken !== "string" || !idToken) throw new Error("missing token");
    const p = await verifyGoogleIdToken(idToken);
    if (!p.email || (p.email_verified !== true && p.email_verified !== "true")) throw new Error("unverified email");
    if (p.hd && p.hd !== "poornima.edu.in") return reject("INVALID_DOMAIN");
    email = p.email.trim().toLowerCase();
  } catch (e) {
    // Server misconfiguration is not the visitor's fault: log it, don't count it against their IP.
    if (e instanceof GoogleConfigError) {
      console.error("[google] server misconfigured:", e.message);
      return fail("SERVER_ERROR");
    }
    // jose error codes (ERR_JWT_EXPIRED, ERR_JWT_CLAIM_VALIDATION_FAILED = wrong audience, ERR_JWKS_TIMEOUT, ...)
    // go to the server log only, never to the browser.
    console.error("[google] token rejected:", (e as { code?: string }).code ?? (e instanceof Error ? e.message : "unknown"));
    return reject("GOOGLE_FAILED");
  }

  if (!email.endsWith("@poornima.edu.in")) return reject("INVALID_DOMAIN", email);
  const user = await findByEmail(email);
  if (!user) return reject("NOT_REGISTERED", email);

  if (!user.password_hash) {
    // Google already proved the user owns this email, so no email step: hand back a short-lived setup token.
    const setupToken = await createToken(user.id, "setup", TTL.setupGoogle);
    return fail("SETUP_REQUIRED", { setupToken, name: user.name });
  }
  return startSession(user);
});
