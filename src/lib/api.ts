import type { ErrorCode } from "@/lib/errors";
import { ERRORS } from "@/lib/errors";

const STATUS: Record<ErrorCode, number> = {
  MISSING_FIELDS: 400,
  INVALID_ENROLLMENT_FORMAT: 400,
  INVALID_CREDENTIALS: 401,
  TOO_MANY_ATTEMPTS: 429,
  INVALID_DOMAIN: 403,
  NOT_REGISTERED: 403,
  GOOGLE_FAILED: 401,
  GOOGLE_POPUP_CLOSED: 400,
  SESSION_EXPIRED: 401,
  NETWORK_ERROR: 500,
};

export function fail(code: ErrorCode) {
  return Response.json(
    { success: false, code, message: ERRORS[code].message },
    { status: STATUS[code], headers: { "Cache-Control": "no-store" } },
  );
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}
