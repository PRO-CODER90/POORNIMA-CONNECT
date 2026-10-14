// Email via Resend's REST API (no SDK). Without RESEND_API_KEY it logs to the server console in
// development only; in production a missing key is a send failure.
export type MailKind = "reset" | "setup" | "changed";

const SUBJECT: Record<MailKind, string> = {
  reset: "Reset your University Portal password",
  setup: "Set up your University Portal password",
  changed: "Your password was changed",
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function body(kind: MailKind, name: string, link?: string) {
  const n = esc(name);
  const button = (label: string) =>
    `<p><a href="${link}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></p>` +
    `<p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${link}</p>`;
  if (kind === "reset")
    return {
      html: `<p>Hi ${n},</p><p>We received a request to reset your University Portal password. Click the button below to choose a new one. This link expires in <b>30 minutes</b> and can be used once.</p>${button("Reset password")}<p>If you didn't request this, ignore this email. Your password won't change.</p>`,
      text: `Hi ${name},\n\nWe received a request to reset your University Portal password. Open this link to choose a new one (expires in 30 minutes, single use):\n${link}\n\nIf you didn't request this, ignore this email.`,
    };
  if (kind === "setup")
    return {
      html: `<p>Hi ${n},</p><p>Welcome to University Portal. Click below to set your password and activate your account. This link expires in <b>60 minutes</b>.</p>${button("Set password")}`,
      text: `Hi ${name},\n\nWelcome to University Portal. Open this link to set your password and activate your account (expires in 60 minutes):\n${link}`,
    };
  return {
    html: `<p>Hi ${n}, your University Portal password was just changed. If this wasn't you, contact support immediately.</p>`,
    text: `Hi ${name}, your University Portal password was just changed. If this wasn't you, contact support immediately.`,
  };
}

/** Throws if the email could not be sent. Never includes a password; only a one-time link. */
export async function sendEmail(to: string, kind: MailKind, name: string, link?: string) {
  const content = body(kind, name, link);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.log(`[dev mail] to=${to} kind=${kind}${link ? ` link=${link}` : ""}`);
    return;
  }
  const res = await fetch(process.env.RESEND_API_URL ?? "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.MAIL_FROM ?? "University Portal <onboarding@resend.dev>",
      to: [to],
      subject: SUBJECT[kind],
      ...content,
    }),
  });
  if (!res.ok) throw new Error(`email provider ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** Base URL for emailed links. Required in production: never trust the request's Host header here. */
export function appUrl(): string {
  const url = process.env.APP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set");
    return "http://localhost:3000";
  }
  return url.replace(/\/$/, "");
}
