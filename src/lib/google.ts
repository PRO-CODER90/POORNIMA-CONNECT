import { createRemoteJWKSet, jwtVerify } from "jose";

// GOOGLE_JWKS_URI is only overridden in tests.
const jwks = createRemoteJWKSet(new URL(process.env.GOOGLE_JWKS_URI ?? "https://www.googleapis.com/oauth2/v3/certs"), {
  timeoutDuration: 5000,
  cooldownDuration: 30000,
});

/** Thrown when the server itself is misconfigured (not the user's fault, so it must not count against their IP). */
export class GoogleConfigError extends Error {}

let warned = false;
function clientId() {
  const server = process.env.GOOGLE_CLIENT_ID;
  const pub = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!warned) {
    warned = true;
    if (!server && !pub) console.error("[google] neither GOOGLE_CLIENT_ID nor NEXT_PUBLIC_GOOGLE_CLIENT_ID is set: Google sign-in cannot work");
    else if (server && pub && server !== pub) console.warn("[google] GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_CLIENT_ID differ: tokens issued to the button will be rejected");
  }
  const id = server ?? pub;
  if (!id) throw new GoogleConfigError("GOOGLE_CLIENT_ID is not set");
  return id;
}

export interface GoogleClaims {
  email?: string;
  email_verified?: boolean | string;
  hd?: string;
  nonce?: string;
}

/** Verifies signature, issuer, audience and expiry of a Google ID token; throws on any failure. */
export async function verifyGoogleIdToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId(),
    algorithms: ["RS256"],
    clockTolerance: 10, // seconds of allowed clock skew
  });
  return payload as GoogleClaims;
}
