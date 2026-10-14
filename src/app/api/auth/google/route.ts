import { fail, clientIp } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { verifyGoogleIdToken } from "@/lib/google";
import { isLimited, recordFailure } from "@/lib/rateLimit";
import { findByEmail } from "@/lib/users";

export async function POST(req: Request) {
  const key = `ip:${clientIp(req)}`;
  if (await isLimited(key)) return fail("TOO_MANY_ATTEMPTS");

  let email: string;
  try {
    const { idToken } = await req.json();
    if (typeof idToken !== "string" || !idToken) throw new Error("missing token");
    const p = await verifyGoogleIdToken(idToken);
    if (!p.email || p.email_verified !== true) throw new Error("unverified email");
    email = p.email.trim().toLowerCase();
  } catch {
    await recordFailure(key);
    return fail("GOOGLE_FAILED");
  }

  if (!email.endsWith("@poornima.edu.in")) {
    await recordFailure(key);
    return fail("INVALID_DOMAIN");
  }
  const user = findByEmail(email);
  if (!user) {
    await recordFailure(key);
    return fail("NOT_REGISTERED");
  }
  return startSession(user);
}
