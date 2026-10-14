// Server-side password policy. The UI mirrors these rules (src/lib/passwordRules.ts) but is not trusted.
import type { ErrorCode } from "@/lib/errors";
import { COMMON_PASSWORDS } from "@/lib/passwordRules";

export function checkPasswordPolicy(pw: string, email: string, enrollmentNo?: string): ErrorCode | null {
  if (pw.length < 8) return "PASSWORD_TOO_SHORT";
  if (pw.length > 64) return "PASSWORD_TOO_LONG"; // bcrypt ignores input past 72 bytes
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "PASSWORD_WEAK";
  const lower = pw.toLowerCase();
  const local = email.split("@")[0].toLowerCase();
  if (local.length >= 6 && lower.includes(local.slice(0, 6))) return "PASSWORD_WEAK";
  if (enrollmentNo && lower.includes(enrollmentNo.toLowerCase())) return "PASSWORD_WEAK";
  if (lower.includes("password") || COMMON_PASSWORDS.has(lower)) return "PASSWORD_WEAK";
  return null;
}
