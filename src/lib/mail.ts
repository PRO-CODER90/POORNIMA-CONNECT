import nodemailer, { type Transporter } from "nodemailer";

export type MailKind = "reset" | "setup" | "changed" | "temp";

export interface MailData {
  name: string;
  loginId?: string; // enrollment no.
  link?: string; // setup or reset link
  tempPassword?: string; // legacy support
}

export interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  from: string;
  isConfigured: boolean;
  missing: string[];
}

const SUBJECT: Record<MailKind, string> = {
  reset: "Reset your University Portal password",
  setup: "Set up your University Portal password",
  changed: "Your University Portal password was changed",
  temp: "Your University Portal login details",
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
    `<p style="margin:24px 0"><a href="${d.link}" style="background:#2563eb;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">${label}</a></p>` +
    `<p style="color:#666;font-size:13px;word-break:break-all">Or paste this link into your browser:<br><a href="${d.link}" style="color:#2563eb">${d.link}</a></p>`;

  if (kind === "reset") {
    return {
      html:
        `<p>Hi ${n},</p>` +
        `<p>You recently requested to reset your password for University Portal. Click the button below to set a new password. This link expires in <b>30 minutes</b> and can be used once.</p>` +
        button("Reset password") +
        `<p style="color:#666;font-size:13px;margin-top:20px">If you didn't request a password reset, you can safely ignore this email. Your current password will remain unchanged.</p>`,
      text:
        `Hi ${d.name},\n\n` +
        `You recently requested to reset your password for University Portal. Open this link to set a new password (expires in 30 minutes):\n` +
        `${d.link}\n\n` +
        `If you didn't request a password reset, you can safely ignore this email. Your current password will remain unchanged.`,
    };
  }

  if (kind === "setup") {
    return {
      html:
        `<p>Hi ${n},</p>` +
        `<p>Welcome to University Portal. Your login ID is <b>${id}</b>. Click below to set your password and activate your account. This link expires in <b>60 minutes</b>.</p>` +
        button("Set password"),
      text:
        `Hi ${d.name},\n\n` +
        `Welcome to University Portal. Your login ID is ${d.loginId}. Open this link to set your password and activate your account (expires in 60 minutes):\n` +
        `${d.link}`,
    };
  }

  if (kind === "changed") {
    return {
      html:
        `<p>Hi ${n},</p>` +
        `<p>Your University Portal password was just changed.</p>` +
        `<p style="color:#666;font-size:13px;margin-top:20px">If you did not make this change, please contact support immediately to secure your account.</p>`,
      text:
        `Hi ${d.name},\n\n` +
        `Your University Portal password was just changed.\n\n` +
        `If you did not make this change, please contact support immediately to secure your account.`,
    };
  }

  // Fallback for legacy "temp" password kind
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
}

export function getEmailConfig(): EmailConfig {
  const host = process.env.SMTP_HOST?.trim() || "";
  const portStr = process.env.SMTP_PORT?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const secureStr = process.env.SMTP_SECURE?.trim();
  const from = process.env.MAIL_FROM?.trim() || "University Portal <no-reply@poornima.edu.in>";

  const missing: string[] = [];
  if (!host) missing.push("SMTP_HOST");
  if (!user) missing.push("SMTP_USER");
  if (!pass) missing.push("SMTP_PASS");

  const parsedPort = portStr ? parseInt(portStr, 10) : 587;
  const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587;
  const secure =
    secureStr !== undefined
      ? secureStr === "true" || secureStr === "1"
      : port === 465;

  return {
    host,
    port,
    user,
    pass,
    secure,
    from,
    isConfigured: missing.length === 0,
    missing,
  };
}

let cachedTransporter: Transporter | null = null;

export function getTransporter(): Transporter {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    throw new Error(`SMTP configuration is missing: ${config.missing.join(", ")}`);
  }

  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 5000,
      socketTimeout: 15000,
    });
  }

  return cachedTransporter;
}

/** Throws if the email could not be sent. Only ever sent to the address on record. */
export async function sendEmail(to: string, kind: MailKind, data: MailData): Promise<void> {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Email delivery failed: missing ${config.missing.join(", ")}`);
    }
    console.warn(`[mail] Warning: SMTP configuration is missing (${config.missing.join(", ")}). Email was not sent.`);
    throw new Error(`SMTP is not configured (missing ${config.missing.join(", ")})`);
  }

  const content = body(kind, data);
  const transporter = getTransporter();

  await transporter.sendMail({
    from: config.from,
    to,
    subject: SUBJECT[kind],
    html: content.html,
    text: content.text,
  });
}

/** Sends an optional operational recovery-request notification to ADMIN_EMAIL, if configured. */
export async function sendAdminRecoveryNotification(data: {
  identifier: string;
  timestamp: Date;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  if (!adminEmail) return;

  const config = getEmailConfig();
  if (!config.isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Admin email delivery failed: missing ${config.missing.join(", ")}`);
    }
    console.warn(`[mail] Warning: SMTP configuration is missing (${config.missing.join(", ")}). Admin notification was not sent.`);
    return;
  }

  const transporter = getTransporter();
  const timeStr = data.timestamp.toUTCString();
  const safeIdentifier = esc(data.identifier);

  const subject = "Notice: Password recovery requested";
  const html =
    `<p>Hello Administrator,</p>` +
    `<p>A password recovery request was initiated for an account in the University Portal.</p>` +
    `<table style="border-collapse:collapse;margin:14px 0;font-size:14px">` +
    `<tr><td style="padding:4px 14px 4px 0;color:#555">Timestamp (UTC):</td><td style="padding:4px 0;font-family:monospace">${timeStr}</td></tr>` +
    `<tr><td style="padding:4px 14px 4px 0;color:#555">Account:</td><td style="padding:4px 0;font-family:monospace">${safeIdentifier}</td></tr>` +
    `</table>` +
    `<p style="color:#666;font-size:13px">This is an automated operational notification. No credentials, passwords, or reset tokens are included.</p>`;

  const text =
    `Hello Administrator,\n\n` +
    `A password recovery request was initiated for an account in the University Portal.\n\n` +
    `Timestamp (UTC): ${timeStr}\n` +
    `Account: ${data.identifier}\n\n` +
    `This is an automated operational notification. No credentials, passwords, or reset tokens are included.`;

  await transporter.sendMail({
    from: config.from,
    to: adminEmail,
    subject,
    html,
    text,
  });
}

/** Diagnostic check: verifies SMTP server connectivity and authentication. Does not guarantee inbox delivery. */
export async function verifySmtpConnection(): Promise<{ success: boolean; error?: string }> {
  const config = getEmailConfig();
  if (!config.isConfigured) {
    return { success: false, error: `Missing SMTP configuration: ${config.missing.join(", ")}` };
  }
  try {
    const transporter = getTransporter();
    await transporter.verify();
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "SMTP connection verification failed" };
  }
}

/** Reset cached transporter instance (useful for automated testing or runtime env reload). */
export function resetTransporterForTesting(): void {
  cachedTransporter = null;
}

/** Base URL for emailed links. Required in production: never trust the request's Host header here. */
export function appUrl(): string {
  let url = process.env.APP_URL?.trim();
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("APP_URL is not set");
    return "http://localhost:3000";
  }
  url = url.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(url)) {
    url = process.env.NODE_ENV === "production" ? `https://${url}` : `http://${url}`;
  } else if (process.env.NODE_ENV === "production" && url.startsWith("http://") && !url.includes("localhost")) {
    url = url.replace(/^http:\/\//i, "https://");
  }
  return url;
}
