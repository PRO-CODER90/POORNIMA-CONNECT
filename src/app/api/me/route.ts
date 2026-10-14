import { fail, ok } from "@/lib/api";
import { getSession } from "@/lib/auth";

export async function GET() {
  const s = await getSession();
  if (!s) return fail("SESSION_EXPIRED");
  return ok({ name: s.name, role: s.role, enrollmentNo: s.enrollmentNo });
}
