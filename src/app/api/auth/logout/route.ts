import { cookies } from "next/headers";
import { guardPost } from "@/lib/api";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: Request) {
  const refused = guardPost(req, { json: false });
  if (refused) return refused;
  (await cookies()).delete(SESSION_COOKIE);
  return Response.json({ success: true });
}
