import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { fail } from "@/lib/errors";
import { findUserByEmail, getPasscodeHash } from "@/lib/users";
import { SESSION_COOKIE, SESSION_MAX_AGE, signJwt, verifyJwt } from "@/lib/session";
import { clearFailures, clientIp, isLimited, recordFailure } from "@/lib/rateLimit";

export async function POST(req: Request) {
  let body: { tempToken?: string; enrollmentNo?: unknown; passcode?: unknown };
  try {
    body = await req.json();
  } catch {
    return fail("GOOGLE_FAILED");
  }

  const temp = await verifyJwt<{ email: string; step: string }>(body.tempToken);
  if (!temp || temp.step !== "google") return fail("SESSION_EXPIRED");

  const keys = [`ip:${clientIp(req)}`, `email:${temp.email.toLowerCase()}`];
  if (keys.some(isLimited)) return fail("TOO_MANY_ATTEMPTS");

  const user = findUserByEmail(temp.email);
  const enrollmentNo = String(body.enrollmentNo ?? "").trim();
  const passcode = typeof body.passcode === "string" ? body.passcode : "";

  if (!user || user.enrollmentNo !== enrollmentNo) {
    keys.forEach(recordFailure);
    return fail("ENROLLMENT_MISMATCH");
  }
  const hash = getPasscodeHash(user.enrollmentNo);
  if (!hash || !passcode || !(await bcrypt.compare(passcode, hash))) {
    keys.forEach(recordFailure);
    return fail("INVALID_PASSCODE");
  }

  keys.forEach(clearFailures);
  const token = await signJwt(
    { enrollmentNo: user.enrollmentNo, name: user.name, role: user.role, email: user.email },
    "1h",
  );
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return Response.json({ success: true, redirect: "/dashboard" });
}
