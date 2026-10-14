export type Role = "student" | "faculty";

export interface UserRecord {
  enrollmentNo: string;
  name: string;
  email: string;
  role: Role;
}

// Sample records. Enrollment numbers are unique across roles, so the role is
// derived from the matched record. Move to a database for real use.
// Passcode hashes are NOT stored here; they come from PASSCODE_HASHES.
export const users: UserRecord[] = [
  { enrollmentNo: "20070", name: "HJ", email: "2024bcaaidshj20070@poornima.edu.in", role: "student" },
  { enrollmentNo: "18915", name: "VS", email: "2024bcaaidsvs18915@poornima.edu.in", role: "student" },
  { enrollmentNo: "18221", name: "Aryan", email: "2024bcaaidshj18221@poornima.edu.in", role: "student" },
  { enrollmentNo: "1234", name: "Rockey", email: "Rockey.Kumar@poornima.edu.in", role: "faculty" },
  { enrollmentNo: "1532", name: "Kavita", email: "Kavita.Jain@poornima.edu.in", role: "faculty" },
];

const norm = (e: string) => e.trim().toLowerCase();

export const findByEmail = (email: string) => users.find((u) => norm(u.email) === norm(email));
export const findByEnrollment = (n: string) => users.find((u) => u.enrollmentNo === n.trim());

/** Valid bcrypt hash compared against for unknown users, so timing doesn't leak who exists. */
export const DUMMY_HASH = "$2b$10$aCIHCyjSHJOKERK9s2BK0OKmOB41mzEQUxE0HyqcxDLa/yUhRv/92";

let cache: Record<string, string> | undefined;
export function passcodeHash(enrollmentNo: string): string | undefined {
  if (!cache) {
    try {
      cache = JSON.parse(Buffer.from(process.env.PASSCODE_HASHES ?? "", "base64").toString() || "{}");
    } catch {
      cache = {};
    }
  }
  return cache?.[enrollmentNo];
}
