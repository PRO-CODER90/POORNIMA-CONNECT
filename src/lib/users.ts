export type Role = "student" | "faculty";

export interface UserRecord {
  enrollmentNo: string;
  name: string;
  email: string;
  role: Role;
}

// Sample records from the spec. Passcode hashes are NOT stored here; they live
// in the PASSCODE_HASHES env var as base64 JSON (see scripts/seed-passcodes.mjs).
export const users: UserRecord[] = [
  { enrollmentNo: "20070", name: "HJ", email: "2024bcaaidshj20070@poornima.edu.in", role: "student" },
  { enrollmentNo: "18915", name: "VS", email: "2024bcaaidsvs18915@poornima.edu.in", role: "student" },
  { enrollmentNo: "18221", name: "Aryan", email: "2024bcaaidshj18221@poornima.edu.in", role: "student" },
  { enrollmentNo: "1234", name: "Rockey", email: "Rockey.Kumar@poornima.edu.in", role: "faculty" },
  { enrollmentNo: "1532", name: "Kavita", email: "Kavita.Jain@poornima.edu.in", role: "faculty" },
];

export const normalizeEmail = (e: string) => e.trim().toLowerCase();

export function findUserByEmail(email: string) {
  const n = normalizeEmail(email);
  return users.find((u) => normalizeEmail(u.email) === n);
}

export function getPasscodeHash(enrollmentNo: string): string | undefined {
  try {
    const map = JSON.parse(Buffer.from(process.env.PASSCODE_HASHES ?? "", "base64").toString() || "{}");
    return map[enrollmentNo];
  } catch {
    return undefined;
  }
}
