import { fail, ok, readJson, withErrors } from "@/lib/api";
import { findValidToken } from "@/lib/tokens";

// Lets the pop-up show "link expired" immediately instead of after the user types a password.
export const POST = withErrors(async (req: Request) => {
  const { token } = await readJson(req);
  const t = await findValidToken(token);
  if (!t) return fail("LINK_INVALID", { valid: false });
  return ok({ valid: true, purpose: t.purpose, name: t.name });
});
