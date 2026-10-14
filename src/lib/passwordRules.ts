// Shared by the server policy and the live checklist in the UI.
export const COMMON_PASSWORDS = new Set([
  "12345678", "123456789", "1234567890", "qwerty123", "qwertyuiop", "abc12345", "abcd1234", "abc123456",
  "iloveyou1", "letmein123", "welcome123", "admin1234", "admin123", "login1234", "changeme1", "passw0rd",
  "p@ssw0rd", "p@ssword1", "monkey123", "dragon123", "football1", "baseball1", "master123", "sunshine1",
  "princess1", "superman1", "batman123", "trustno1", "111111aa", "aaaa1111", "1q2w3e4r", "1qaz2wsx",
  "q1w2e3r4", "zaq12wsx", "qazwsx123", "asdfghjk1", "asdf1234", "zxcvbnm123", "poornima1", "poornima123",
  "university1", "student123", "faculty123", "india12345", "india@123", "welcome@123", "admin@123", "test1234",
]);

export interface Rule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

export const RULES: Rule[] = [
  { id: "len", label: "8 to 64 characters", test: (p) => p.length >= 8 && p.length <= 64 },
  { id: "letter", label: "At least one letter", test: (p) => /[A-Za-z]/.test(p) },
  { id: "digit", label: "At least one number", test: (p) => /\d/.test(p) },
  { id: "common", label: "Not a common password", test: (p) => p.length > 0 && !COMMON_PASSWORDS.has(p.toLowerCase()) && !p.toLowerCase().includes("password") },
];

/** 0 (empty) to 4 */
export function strength(pw: string): number {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw) || (/[a-z]/.test(pw) && /[A-Z]/.test(pw))) s++;
  return Math.min(s, 4);
}
