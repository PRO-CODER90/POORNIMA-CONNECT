import { cookies } from "next/headers";
import { fail } from "@/lib/api";
import { SESSION_COOKIE, verifyJwt, type SessionPayload } from "@/lib/session";

export async function GET() {
  const s = await verifyJwt<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return fail("SESSION_EXPIRED");
  return Response.json({ name: s.name, role: s.role, enrollmentNo: s.enrollmentNo });
}
