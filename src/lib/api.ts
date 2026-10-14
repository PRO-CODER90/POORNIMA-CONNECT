import { ERRORS, type ErrorCode } from "@/lib/errors";

const NO_STORE = { "Cache-Control": "no-store" };

export function fail(code: ErrorCode, extra: Record<string, unknown> = {}) {
  const { status, message } = ERRORS[code];
  return Response.json({ success: false, code, message, ...extra }, { status, headers: NO_STORE });
}

export function ok(body: Record<string, unknown> = {}) {
  return Response.json({ success: true, ...body }, { headers: NO_STORE });
}

export function clientIp(req: Request) {
  return req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  const body = await req.json().catch(() => null);
  return body && typeof body === "object" ? (body as Record<string, unknown>) : {};
}

/** Wraps a route so an unexpected failure (e.g. database unreachable, missing env var) returns JSON, not an empty 500. */
export function withErrors<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      console.error("[api] unhandled error:", e);
      return fail("SERVER_ERROR");
    }
  };
}
