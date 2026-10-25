// Contact form rules shared by the browser form and the API.
import { z } from "zod";

/** Strips CR/LF so a value can never start a new mail header. */
export const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();

export const SUBJECTS = ["General question", "Order issue", "Account / login help", "Feedback", "Report a problem"] as const;

export const contactSchema = z.object({
  name: z.string().transform(oneLine).pipe(z.string().min(2, "Enter your name (at least 2 characters).").max(80, "Name is too long.")),
  email: z.string().trim().toLowerCase().max(254, "Email is too long.").email("Enter a valid email address."),
  subject: z.enum(SUBJECTS, { error: "Choose a subject." }),
  message: z.string().trim().min(10, "Write at least 10 characters.").max(2000, "Keep the message under 2000 characters."),
  consent: z.literal(true, { error: "Please agree to the Privacy Policy." }),
});

export type ContactInput = z.infer<typeof contactSchema>;

export function parseContact(raw: unknown): { ok: true; value: ContactInput } | { ok: false; errors: Record<string, string> } {
  const r = contactSchema.safeParse(raw);
  if (r.success) return { ok: true, value: r.data };
  const errors: Record<string, string> = {};
  for (const i of r.error.issues) errors[String(i.path[0] ?? "form")] ??= i.message;
  return { ok: false, errors };
}

