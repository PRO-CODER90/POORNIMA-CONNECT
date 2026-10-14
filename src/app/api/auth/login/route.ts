import bcrypt from "bcryptjs";
import { fail, clientIp } from "@/lib/api";
import { startSession } from "@/lib/auth";
import { clearFailures, isLimited, recordFailure } from "@/lib/rateLimit";
import { DUMMY_HASH, findByEnrollment, passcodeHash } from "@/lib/users";

// Role is NOT sent by the client: it comes from the matched record.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const enr = String(body?.enrollmentNo ?? "").trim();
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";

  if (!enr || !passcode) return fail("MISSING_FIELDS");
  if (!/^\d{1,20}$/.test(enr)) return fail("INVALID_ENROLLMENT_FORMAT");

  // Per IP+enrollment and per enrollment, so spoofed IPs can't brute-force one account.
  const keys = [`ipenr:${clientIp(req)}:${enr}`, `enr:${enr}`];
  if (await isLimited(...keys)) return fail("TOO_MANY_ATTEMPTS");

  const user = findByEnrollment(enr);
  const hash = user ? passcodeHash(user.enrollmentNo) : undefined;
  // Always run one bcrypt comparison so timing doesn't reveal which enrollments exist.
  const matches = await bcrypt.compare(passcode, hash ?? DUMMY_HASH);

  if (!user || !hash || !matches) {
    await recordFailure(...keys);
    return fail("INVALID_CREDENTIALS");
  }
  await clearFailures(...keys);
  return startSession(user);
}
