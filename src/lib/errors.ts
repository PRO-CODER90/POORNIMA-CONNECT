// Messages shown to the user. Codes match the API responses (src/lib/api.ts).
export const ERRORS = {
  MISSING_FIELDS: { status: 400, message: "Please fill in all required fields." },
  INVALID_ENROLLMENT_FORMAT: { status: 400, message: "Login ID should contain only letters and numbers." },
  INVALID_CREDENTIALS: { status: 401, message: "Incorrect enrollment number or password. Please try again." },
  TOO_MANY_ATTEMPTS: { status: 429, message: "Too many failed attempts. Please try again in 10 minutes." },
  TOO_MANY_REQUESTS: { status: 429, message: "Too many requests. Please try again in 15 minutes." },
  INVALID_DOMAIN: { status: 403, message: "Please sign in with your Poornima University email (@poornima.edu.in)." },
  NOT_REGISTERED: { status: 403, message: "This email isn't registered in the University Portal. Contact support if this is a mistake." },
  GOOGLE_FAILED: { status: 401, message: "We couldn't sign you in with Google. Please try again or use your password." },
  GOOGLE_POPUP_CLOSED: { status: 400, message: "Sign-in was cancelled. Please try again." },
  SESSION_EXPIRED: { status: 401, message: "Your session has expired. Please sign in again." },
  SERVER_ERROR: { status: 500, message: "Something went wrong on our side. Please try again shortly." },
  FORBIDDEN: { status: 403, message: "This request isn't allowed." },
  UNSUPPORTED_MEDIA: { status: 415, message: "Unsupported request format." },
  NETWORK_ERROR: { status: 500, message: "Network error. Check your connection and try again." },
  LINK_INVALID: { status: 400, message: "This link is invalid or has expired. Please request a new one." },
  PASSWORD_MISMATCH: { status: 400, message: "Passwords don't match." },
  PASSWORD_TOO_SHORT: { status: 400, message: "Password must be at least 8 characters." },
  PASSWORD_TOO_LONG: { status: 400, message: "Password must be 64 characters or fewer." },
  PASSWORD_WEAK: { status: 400, message: "Choose a stronger password with letters and numbers, and avoid personal details or common words." },
  PASSWORD_REUSED: { status: 400, message: "Please choose a password different from your current one." },
  EMAIL_SEND_FAILED: { status: 502, message: "We couldn't send the email right now. Please try again shortly." },
  SETUP_REQUIRED: { status: 403, message: "Set your password to activate your account." },
  PASSWORD_CHANGE_REQUIRED: { status: 403, message: "You signed in with a temporary password. Please choose a new password." },
  SETUP_REQUIRED_EMAIL: { status: 403, message: "Welcome! We've sent a secure link to your registered email to set your password." },
} as const;

export type ErrorCode = keyof typeof ERRORS;
