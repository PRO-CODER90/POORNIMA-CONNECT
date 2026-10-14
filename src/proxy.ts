import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyJwt } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const session = await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const url = new URL("/", req.url);
  if (req.cookies.has(SESSION_COOKIE)) url.searchParams.set("error", "SESSION_EXPIRED");
  return NextResponse.redirect(url);
}

// /api/* is rewritten to the PHP backend, which checks the session itself.
export const config = { matcher: ["/dashboard/:path*"] };
