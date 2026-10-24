import { SignJWT, jwtVerify } from "jose";

// "__Host-" makes browsers require Secure, Path=/ and no Domain, so the cookie can't be set from a sibling subdomain.
// Plain http://localhost can't store Secure cookies, so development keeps the short name.
export const SESSION_COOKIE = process.env.NODE_ENV === "production" ? "__Host-session" : "session";
export const SESSION_MAX_AGE = 60 * 60; // 1 hour

const PLACEHOLDERS = new Set(["changeme", "change-me", "secret", "your-secret", "your_secret_here", "replace-me"]);
let checked = false;

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  if (!checked) {
    checked = true;
    if (PLACEHOLDERS.has(s.toLowerCase())) throw new Error("JWT_SECRET is a placeholder value: set a long random string");
    if (s.length < 32) console.warn("[session] JWT_SECRET is shorter than 32 characters: generate a longer one (openssl rand -base64 48)");
  }
  return new TextEncoder().encode(s);
}

export async function signJwt(payload: Record<string, unknown>, expiresIn: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(expiresIn).sign(secret());
}

export async function verifyJwt<T = Record<string, unknown>>(token: string | undefined): Promise<T | null> {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret())).payload as T;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  enrollmentNo: string;
  name: string;
  role: "student" | "faculty" | "staff" | "admin";
  email: string;
  uid: number;
  tv: number; // token_version at login; a password change bumps it and kills older sessions
}
