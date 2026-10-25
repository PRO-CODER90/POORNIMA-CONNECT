import { getDb } from "@/lib/db";

export type Role = "student" | "faculty" | "staff" | "admin";

export interface UserRow {
  id: number;
  role: Role;
  enrollment_no: string;
  name: string;
  email: string;
  /** Optional personal address; reset links go here too. */
  personal_email: string | null;
  password_hash: string | null;
  token_version: number;
}


export async function findByEnrollment(enrollmentNo: string): Promise<UserRow | null> {
  const rows = await getDb()<UserRow[]>`
    SELECT id, role, enrollment_no, name, email, personal_email, password_hash, token_version
      FROM users WHERE enrollment_no = ${enrollmentNo.trim().toUpperCase()}`; // staff IDs are stored uppercase
  return rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const rows = await getDb()<UserRow[]>`
    SELECT id, role, enrollment_no, name, email, personal_email, password_hash, token_version
      FROM users WHERE email = ${email.trim().toLowerCase()}`;
  return rows[0] ?? null;
}

/** Forgot-password lookup: the identifier is an email (contains "@") or an enrollment number. */
export async function findByEmailOrEnrollment(identifier: string): Promise<UserRow | null> {
  const id = identifier.trim().toLowerCase();
  return id.includes("@") ? findByEmail(id) : findByEnrollment(id);
}

export async function findById(id: number): Promise<UserRow | null> {
  const rows = await getDb()<UserRow[]>`
    SELECT id, role, enrollment_no, name, email, personal_email, password_hash, token_version
      FROM users WHERE id = ${id}`;
  return rows[0] ?? null;
}

/** 20••••••@poornima.edu.in */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(6)}@${domain}`; // fixed length: don't reveal the address length
}

