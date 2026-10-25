import { getDb } from "@/lib/db";
import { sendContactEmail } from "@/lib/mail";
import { CONTACT_EMAIL_LIMIT, CONTACT_IP_LIMIT, isLimited, recordHit } from "@/lib/rateLimit";
import { submitContact } from "@/lib/contact";

export async function POST(req: Request) {
  return submitContact(req, {
    limited: async (ipKey, emailKey) =>
      (await isLimited([ipKey], CONTACT_IP_LIMIT, { failClosed: true })) || (await isLimited([emailKey], CONTACT_EMAIL_LIMIT, { failClosed: true })),
    hit: async (ipKey, emailKey) => {
      await recordHit([ipKey], CONTACT_IP_LIMIT);
      await recordHit([emailKey], CONTACT_EMAIL_LIMIT);
    },
    store: async (m) => {
      const [row] = await getDb()<{ id: string }[]>`
        INSERT INTO contact_messages (name, email, subject, message, ip_hash, user_agent)
        VALUES (${m.name}, ${m.email}, ${m.subject}, ${m.message}, ${m.ipHash}, ${m.userAgent}) RETURNING id`;
      return row.id;
    },
    markSent: async (id) => {
      await getDb()`UPDATE contact_messages SET email_sent = true WHERE id = ${id}`;
    },
    send: sendContactEmail,
    secret: process.env.JWT_SECRET ?? "",
  });
}
