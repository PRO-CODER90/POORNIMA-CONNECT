export const ERRORS = {
  GOOGLE_POPUP_CLOSED: { status: 400, message: "Sign-in was cancelled. Please try again." },
  GOOGLE_FAILED: { status: 401, message: "We couldn't sign you in with Google. Please try again." },
  INVALID_DOMAIN: { status: 403, message: "Please sign in with your Poornima University email (@poornima.edu.in)." },
  NOT_REGISTERED: { status: 403, message: "This email is not registered in the University Portal. Contact support if you think this is a mistake." },
  ENROLLMENT_MISMATCH: { status: 403, message: "The enrollment number doesn't match this account. Please check and try again." },
  INVALID_PASSCODE: { status: 401, message: "Incorrect passcode. Please try again." },
  TOO_MANY_ATTEMPTS: { status: 429, message: "Too many failed attempts. Please try again after 10 minutes." },
  SESSION_EXPIRED: { status: 401, message: "Your session has expired. Please sign in again." },
  NETWORK_ERROR: { status: 0, message: "Network error. Check your connection and try again." },
} as const;

export type ErrorCode = keyof typeof ERRORS;

export function fail(code: ErrorCode) {
  const { status, message } = ERRORS[code];
  return Response.json({ success: false, code, message }, { status: status || 500 });
}
