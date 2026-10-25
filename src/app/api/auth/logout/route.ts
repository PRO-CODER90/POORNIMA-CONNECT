import { cookies } from "next/headers";
import { guardPost } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  // Expire it with the same attributes it was set with (a __Host- cookie must be Secure, Path=/ to be touched).
  (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return Response.json({ success: true });
}
