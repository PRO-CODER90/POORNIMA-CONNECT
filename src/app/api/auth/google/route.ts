import { OAuth2Client } from "google-auth-library";
import { fail } from "@/lib/errors";
import { findUserByEmail } from "@/lib/users";
import { signJwt } from "@/lib/session";
import { clientIp, isLimited, recordFailure } from "@/lib/rateLimit";

const DOMAIN = "@poornima.edu.in";

export async function POST(req: Request) {
  const ipKey = `ip:${clientIp(req)}`;
  if (isLimited(ipKey)) return fail("TOO_MANY_ATTEMPTS");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  try {
    const { idToken } = await req.json();
    if (!clientId || typeof idToken !== "string") throw new Error("bad request");

    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken, audience: clientId });
    const payload = ticket.getPayload();
    const email = payload?.email;
    if (!email || payload?.email_verified !== true) throw new Error("unverified");

    if (!email.trim().toLowerCase().endsWith(DOMAIN)) {
      recordFailure(ipKey);
      return fail("INVALID_DOMAIN");
    }
    const user = findUserByEmail(email);
    if (!user) {
      recordFailure(ipKey);
      return fail("NOT_REGISTERED");
    }
    const tempToken = await signJwt({ email: user.email, step: "google" }, "5m");
    return Response.json({ success: true, needsVerification: true, tempToken });
  } catch {
    recordFailure(ipKey);
    return fail("GOOGLE_FAILED");
  }
}
