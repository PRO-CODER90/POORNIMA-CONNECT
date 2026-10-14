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
