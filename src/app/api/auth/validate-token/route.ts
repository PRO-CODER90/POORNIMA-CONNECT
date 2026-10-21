import { clientIp, fail, guardPost, ok, readJson, withErrors } from "@/lib/api";
import { isLimited, recordHit, VALIDATE_LIMIT } from "@/lib/rateLimit";
import { findValidToken } from "@/lib/tokens";

// Lets the set-password screen show "link expired" immediately instead of after the user types a password.
export const POST = withErrors(async (req: Request) => {
  const refused = guardPost(req);
  if (refused) return refused;
  const ipKey = [`validate:${clientIp(req)}`];
  if (await isLimited(ipKey, VALIDATE_LIMIT)) return fail("TOO_MANY_REQUESTS");
  await recordHit(ipKey, VALIDATE_LIMIT);
  const { token } = await readJson(req);
  const t = await findValidToken(token);
  if (!t) return fail("LINK_INVALID", { valid: false });
  return ok({ valid: true, purpose: t.purpose, name: t.name });
});
