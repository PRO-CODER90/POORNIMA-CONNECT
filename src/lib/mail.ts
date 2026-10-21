// Email via Resend's REST API (no SDK). Without RESEND_API_KEY it logs to the server console in
// development only; in production a missing key is a send failure.
export type MailKind = "temp" | "setup" | "changed";

export interface MailData {
  name: string;
  loginId?: string; // enrollment no.
  link?: string; // setup link
  tempPassword?: string; // forgot-password only; one-time, 30 minutes, forces a change on use
}

const SUBJECT: Record<MailKind, string> = {
  temp: "Your University Portal login details",
  setup: "Set up your University Portal password",
  changed: "Your password was changed",
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function body(kind: MailKind, d: MailData) {
  const n = esc(d.name);
  const id = esc(d.loginId ?? "");
  const box = (rows: [string, string][]) =>
    `<table style="border-collapse:collapse;margin:14px 0;font-size:15px">${rows
      .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#555">${k}</td><td style="padding:6px 0;font-family:monospace;font-size:16px;font-weight:bold">${v}</td></tr>`)
      .join("")}</table>`;
  const button = (label: string) =>
    `<p><a href="${d.link}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block">${label}</a></p>` +
    `<p style="color:#666;font-size:13px">Or paste this link into your browser:<br>${d.link}</p>`;

  if (kind === "temp")
    return {
      html:
        `<p>Hi ${n},</p><p>You asked to reset your University Portal password. Use these details to sign in:</p>` +
        box([["Login ID (Enrollment No.)", id], ["Temporary password", esc(d.tempPassword ?? "")]]) +
        `<p>The temporary password works <b>once</b> and expires in <b>30 minutes</b>. After signing in you'll be asked to choose a new password.</p>` +
        `<p>If you didn't request this, ignore this email. Your current password still works.</p>`,
      text:
        `Hi ${d.name},\n\nYou asked to reset your University Portal password. Use these details to sign in:\n\n` +
        `Login ID (Enrollment No.): ${d.loginId}\nTemporary password: ${d.tempPassword}\n\n` +
        `The temporary password works once and expires in 30 minutes. After signing in you'll be asked to choose a new password.\n\n` +
        `If you didn't request this, ignore this email. Your current password still works.`,
    };
  if (kind === "setup")
    return {
      html:
        `<p>Hi ${n},</p><p>Welcome to University Portal. Your login ID is <b>${id}</b>. Click below to set your password and activate your account. This link expires in <b>60 minutes</b>.</p>${button("Set password")}`,
      text: `Hi ${d.name},\n\nWelcome to University Portal. Your login ID is ${d.loginId}. Open this link to set your password and activate your account (expires in 60 minutes):\n${d.link}`,
    };
  return {
    html: `<p>Hi ${n}, your University Portal password was just changed. If this wasn't you, contact support immediately.</p>`,
    text: `Hi ${d.name}, your University Portal password was just changed. If this wasn't you, contact support immediately.`,
  };
}

/** Throws if the email could not be sent. Only ever sent to the address on record. */
export async function sendEmail(to: string, kind: MailKind, data: MailData) {
  const content = body(kind, data);
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set");
    console.log(`[dev mail] to=${to} kind=${kind}\n${content.text}`);
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
