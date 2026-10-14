import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyJwt } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const session = await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return Response.json(
      { success: false, code: "SESSION_EXPIRED", message: "Your session has expired. Please sign in again." },
      { status: 401 },
    );
  }
  const url = new URL("/", req.url);
  if (req.cookies.has(SESSION_COOKIE)) url.searchParams.set("error", "SESSION_EXPIRED");
  return NextResponse.redirect(url);
}

// /api/auth/* stays public; everything else listed here needs a session.
export const config = { matcher: ["/dashboard/:path*", "/api/((?!auth).*)"] };
