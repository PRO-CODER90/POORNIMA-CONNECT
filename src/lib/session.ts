import { jwtVerify } from "jose";

export const SESSION_COOKIE = "session";

// The PHP backend signs the session JWT (HS256); this only verifies it, so
// JWT_SECRET must match backend/.env.
function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(s);
}

export async function verifyJwt<T = Record<string, unknown>>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as T;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  enrollmentNo: string;
  name: string;
  role: "student" | "faculty";
  email: string;
}
