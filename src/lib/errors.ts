// Messages mirror backend/src/Errors.php.
export const ERRORS = {
  MISSING_FIELDS: { message: "Please enter your enrollment number and passcode." },
  INVALID_ENROLLMENT_FORMAT: { message: "Enrollment number should contain digits only." },
  INVALID_CREDENTIALS: { message: "Incorrect enrollment number or passcode. Please try again." },
  TOO_MANY_ATTEMPTS: { message: "Too many failed attempts. Please try again in 10 minutes." },
  INVALID_DOMAIN: { message: "Please sign in with your Poornima University email (@poornima.edu.in)." },
  NOT_REGISTERED: { message: "This email isn't registered in the University Portal. Contact support if this is a mistake." },
  GOOGLE_FAILED: { message: "We couldn't sign you in with Google. Please try again or use your passcode." },
  GOOGLE_POPUP_CLOSED: { message: "Sign-in was cancelled. Please try again." },
  SESSION_EXPIRED: { message: "Your session has expired. Please sign in again." },
  NETWORK_ERROR: { message: "Network error. Check your connection and try again." },
} as const;

export type ErrorCode = keyof typeof ERRORS;
