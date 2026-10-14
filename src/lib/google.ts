import { createRemoteJWKSet, jwtVerify } from "jose";

// GOOGLE_JWKS_URI is only overridden in tests.
const jwks = createRemoteJWKSet(new URL(process.env.GOOGLE_JWKS_URI ?? "https://www.googleapis.com/oauth2/v3/certs"));

/** Verifies signature, issuer, audience and expiry of a Google ID token; throws on any failure. */
export async function verifyGoogleIdToken(idToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is not set");
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
    algorithms: ["RS256"],
  });
  return payload as { email?: string; email_verified?: boolean };
}
