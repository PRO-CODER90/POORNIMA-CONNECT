import { cookies } from "next/headers";
import { ok } from "@/lib/api";
import { findById, type UserRow } from "@/lib/users";
import { SESSION_COOKIE, SESSION_MAX_AGE, signJwt, verifyJwt, type SessionPayload } from "@/lib/session";

/** Sets the session cookie and returns the success response (used by both login methods). */
export async function startSession(u: UserRow) {
  const token = await signJwt(
    { enrollmentNo: u.enrollment_no, name: u.name, role: u.role, email: u.email, uid: u.id, tv: u.token_version },
    "1h",
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return ok({ redirect: "/dashboard" });
}

/** Verifies the cookie AND that the user's token_version in the database still matches. */
export async function getSession(): Promise<SessionPayload | null> {
  const s = await verifyJwt<SessionPayload>((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s || typeof s.uid !== "number") return null;
  const user = await findById(s.uid);
  if (!user || user.token_version !== s.tv) return null;
  return s;
}
