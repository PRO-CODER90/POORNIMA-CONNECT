import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifyJwt } from "@/lib/session";

export async function proxy(req: NextRequest) {
  const session = await verifyJwt(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  const url = new URL("/", req.url);
  if (req.cookies.has(SESSION_COOKIE)) url.searchParams.set("error", "SESSION_EXPIRED");
  return NextResponse.redirect(url);
}

// Signed-out visitors to any signed-in area go to the login page. API routes and the CafeConnect pages
// still check the session (and role) themselves.
export const config = {
  matcher: ["/dashboard/:path*", "/student/:path*", "/staff/:path*", "/admin/:path*", "/cafe/:path*"],
};
