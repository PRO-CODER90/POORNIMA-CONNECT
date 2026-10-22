// Diagnostic script: verifies SMTP configuration and connection safely.
// Run: node --env-file-if-exists=.env.local scripts/verify-smtp.mjs

import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST?.trim();
const portStr = process.env.SMTP_PORT?.trim();
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS?.trim();
const secureStr = process.env.SMTP_SECURE?.trim();
const from = process.env.MAIL_FROM?.trim();

const missing = [];
if (!host) missing.push("SMTP_HOST");
if (!user) missing.push("SMTP_USER");
if (!pass) missing.push("SMTP_PASS");

if (missing.length > 0) {
  console.log(`[SMTP Check] Incomplete configuration. Missing environment variables: ${missing.join(", ")}`);
  console.log(`[SMTP Check] Please configure them in .env.local or your environment.`);
  process.exit(1);
}

const parsedPort = portStr ? parseInt(portStr, 10) : 587;
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 587;
const secure = secureStr !== undefined ? secureStr === "true" || secureStr === "1" : port === 465;

console.log(`[SMTP Check] Checking connection to ${host}:${port} (secure: ${secure}, sender: ${from || "default"})...`);

const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 15000,
});

try {
  await transporter.verify();
  console.log(`[SMTP Check] SUCCESS: SMTP credentials and handshake verified!`);
  console.log(`[SMTP Check] Ready for email delivery.`);
} catch (err) {
  console.error(`[SMTP Check] FAILED: ${err instanceof Error ? err.message : "Connection failed"}`);
  process.exit(1);
}
