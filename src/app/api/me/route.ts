import { fail, ok, withErrors } from "@/lib/api";
import { getSession } from "@/lib/auth";

export const GET = withErrors(async () => {
  const s = await getSession();
  if (!s) return fail("SESSION_EXPIRED");
  return ok({ name: s.name, role: s.role, enrollmentNo: s.enrollmentNo });
});
