// RFC 9116 security.txt. Served only once SECURITY_CONTACT is set to a real, monitored mailbox.
export function GET() {
  const contact = process.env.SECURITY_CONTACT?.trim();
  if (!contact) return new Response("Not found", { status: 404 });
  const base = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const expires = new Date(Date.now() + 180 * 86_400_000).toISOString(); // well under a year, refreshed on each deploy
  const body = [
    `Contact: ${contact.includes(":") ? contact : `mailto:${contact}`}`,
    `Expires: ${expires}`,
    "Preferred-Languages: en",
    ...(base ? [`Canonical: ${base}/.well-known/security.txt`, `Policy: ${base}/about#security`] : []),
    "",
  ].join("\n");
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=86400" } });
}
