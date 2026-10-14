import { cookies } from "next/headers";
import type { UserRecord } from "@/lib/users";
import { SESSION_COOKIE, SESSION_MAX_AGE, signJwt } from "@/lib/session";

/** Sets the session cookie and returns the success response (used by both login methods). */
export async function startSession(u: UserRecord) {
  const token = await signJwt(
    { enrollmentNo: u.enrollmentNo, name: u.name, role: u.role, email: u.email },
    "1h",
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return Response.json({ success: true, redirect: "/dashboard" }, { headers: { "Cache-Control": "no-store" } });
}
