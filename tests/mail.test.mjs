import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import nodemailer from "nodemailer";
import {
  getEmailConfig,
  sendEmail,
  sendAdminRecoveryNotification,
  appUrl,
  verifySmtpConnection,
  resetTransporterForTesting,
} from "../src/lib/mail.ts";

describe("Nodemailer Mail Service Audit & Unit Tests", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    resetTransporterForTesting();
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_SECURE;
    delete process.env.MAIL_FROM;
    delete process.env.ADMIN_EMAIL;
    delete process.env.APP_URL;
    delete process.env.RESEND_API_KEY;
  });

  afterEach(() => {
    resetTransporterForTesting();
    process.env = { ...origEnv };
  });

  describe("getEmailConfig()", () => {
    it("uses Resend's SMTP relay when only RESEND_API_KEY is set", () => {
      process.env.RESEND_API_KEY = "re_test";
      const c = getEmailConfig();
      assert.equal(c.isConfigured, true);
      assert.deepEqual([c.host, c.port, c.secure, c.user, c.pass], ["smtp.resend.com", 465, true, "resend", "re_test"]);
      assert.match(c.from, /onboarding@resend\.dev/);
      process.env.MAIL_FROM = "PU <no-reply@cafe.example.in>";
      assert.equal(getEmailConfig().from, "PU <no-reply@cafe.example.in>");
      process.env.SMTP_HOST = "smtp.other.com";
      assert.equal(getEmailConfig().host, "smtp.other.com", "explicit SMTP settings win");
    });

    it("reports missing variables when SMTP is not configured", () => {
      const config = getEmailConfig();
      assert.equal(config.isConfigured, false);
      assert.deepEqual(config.missing, ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]);
      assert.equal(config.port, 587);
      assert.equal(config.secure, false);
    });

    it("detects valid complete SMTP configuration", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "portal@example.com";
      process.env.SMTP_PASS = "secret123";
      process.env.SMTP_SECURE = "true";
      process.env.MAIL_FROM = "Poornima Portal <no-reply@poornima.edu.in>";

      const config = getEmailConfig();
      assert.equal(config.isConfigured, true);
      assert.equal(config.host, "smtp.example.com");
      assert.equal(config.port, 465);
      assert.equal(config.user, "portal@example.com");
      assert.equal(config.pass, "secret123");
      assert.equal(config.secure, true);
      assert.equal(config.from, "Poornima Portal <no-reply@poornima.edu.in>");
      assert.deepEqual(config.missing, []);
    });

    it("defaults secure to true when port is 465 and SMTP_SECURE is omitted", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const config = getEmailConfig();
      assert.equal(config.port, 465);
      assert.equal(config.secure, true);
    });

    it("defaults port to 587 if invalid non-numeric port string is provided", () => {
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_PORT = "invalid-port";
      process.env.SMTP_USER = "user";
      process.env.SMTP_PASS = "pass";

      const config = getEmailConfig();
      assert.equal(config.port, 587);
    });
  });

  describe("appUrl()", () => {
    it("returns localhost in development when APP_URL is unset", () => {
      process.env.NODE_ENV = "development";
      delete process.env.APP_URL;
      assert.equal(appUrl(), "http://localhost:3000");
    });

    it("throws error in production when APP_URL is unset", () => {
      process.env.NODE_ENV = "production";
      delete process.env.APP_URL;
      assert.throws(() => appUrl(), /APP_URL is not set/);
    });

    it("strips trailing slash", () => {
      process.env.NODE_ENV = "production";
      process.env.APP_URL = "https://poornima-portal.vercel.app/";
      assert.equal(appUrl(), "https://poornima-portal.vercel.app");
    });

    it("enforces https in production when protocol is missing", () => {
      process.env.NODE_ENV = "production";
      process.env.APP_URL = "poornima-portal.vercel.app";
      assert.equal(appUrl(), "https://poornima-portal.vercel.app");
    });

    it("upgrades http to https in production for remote domains", () => {
      process.env.NODE_ENV = "production";
      process.env.APP_URL = "http://poornima-portal.vercel.app";
      assert.equal(appUrl(), "https://poornima-portal.vercel.app");
    });
  });

  describe("sendEmail() and Templates", () => {
    it("throws safe error when SMTP configuration is missing", async () => {
      process.env.NODE_ENV = "production";
      await assert.rejects(
        () => sendEmail("student@poornima.edu.in", "reset", { name: "Test User", link: "https://example.com/?reset=123" }),
        /Email delivery failed: missing SMTP_HOST, SMTP_USER, SMTP_PASS/
      );
    });

    it("sends password reset email with correct template content through mocked transporter", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";
      process.env.MAIL_FROM = "University Portal <no-reply@poornima.edu.in>";

      const sentMails = [];
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        sendMail: async (opts) => {
          sentMails.push(opts);
          return { messageId: "test-msg-id" };
        },
        verify: async () => true,
      });

      try {
        resetTransporterForTesting();
        const testLink = "https://portal.poornima.edu.in/?reset=secure_token_xyz";
        await sendEmail("student@poornima.edu.in", "reset", {
          name: "Aryan Sharma",
          link: testLink,
        });

        assert.equal(sentMails.length, 1);
        const mail = sentMails[0];
        assert.equal(mail.to, "student@poornima.edu.in");
        assert.equal(mail.from, "University Portal <no-reply@poornima.edu.in>");
        assert.equal(mail.subject, "Reset your University Portal password");
        assert.match(mail.html, /Aryan Sharma/);
        assert.match(mail.html, /30 minutes/);
        assert.match(mail.html, /Reset password/);
        assert.match(mail.html, new RegExp(testLink.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
        assert.match(mail.text, /Aryan Sharma/);
        assert.match(mail.text, /30 minutes/);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });

    it("escapes special HTML characters in user name to prevent XSS", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";

      const sentMails = [];
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        sendMail: async (opts) => {
          sentMails.push(opts);
          return { messageId: "test-msg-id" };
        },
      });

      try {
        resetTransporterForTesting();
        await sendEmail("student@poornima.edu.in", "reset", {
          name: '<script>alert("xss")</script>',
          link: "https://portal.poornima.edu.in/?reset=tok",
        });

        assert.equal(sentMails.length, 1);
        assert.doesNotMatch(sentMails[0].html, /<script>/);
        assert.match(sentMails[0].html, /&#60;script&#62;/);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });

    it("sends password changed confirmation email without containing passwords", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";

      const sentMails = [];
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        sendMail: async (opts) => {
          sentMails.push(opts);
          return { messageId: "test-msg-id" };
        },
      });

      try {
        resetTransporterForTesting();
        await sendEmail("student@poornima.edu.in", "changed", { name: "Rockey" });

        assert.equal(sentMails.length, 1);
        assert.equal(sentMails[0].subject, "Your University Portal password was changed");
        assert.match(sentMails[0].html, /password was just changed/);
        assert.match(sentMails[0].html, /contact support immediately/);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });
  });

  describe("Admin Recovery Notification", () => {
    it("skips sending when ADMIN_EMAIL is not configured", async () => {
      delete process.env.ADMIN_EMAIL;
      let called = false;
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        sendMail: async () => {
          called = true;
          return { messageId: "test-msg-id" };
        },
      });

      try {
        resetTransporterForTesting();
        await sendAdminRecoveryNotification({
          identifier: "20070 (20••••••@poornima.edu.in)",
          timestamp: new Date(),
        });
        assert.equal(called, false);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });

    it("sends non-sensitive admin notification when ADMIN_EMAIL is set", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";
      process.env.ADMIN_EMAIL = "admin@poornima.edu.in";

      const sentMails = [];
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        sendMail: async (opts) => {
          sentMails.push(opts);
          return { messageId: "test-msg-id" };
        },
      });

      try {
        resetTransporterForTesting();
        const testTimestamp = new Date("2026-10-22T10:00:00Z");
        await sendAdminRecoveryNotification({
          identifier: "20070 (20••••••@poornima.edu.in)",
          timestamp: testTimestamp,
        });

        assert.equal(sentMails.length, 1);
        const mail = sentMails[0];
        assert.equal(mail.to, "admin@poornima.edu.in");
        assert.equal(mail.subject, "Notice: Password recovery requested");
        assert.match(mail.html, /20070 \(20••••••@poornima\.edu\.in\)/);
        assert.match(mail.html, /No credentials, passwords, or reset tokens are included/);
        assert.doesNotMatch(mail.html, /password=/);
        assert.doesNotMatch(mail.html, /reset=/);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });
  });

  describe("verifySmtpConnection()", () => {
    it("returns error when configuration is missing", async () => {
      const res = await verifySmtpConnection();
      assert.equal(res.success, false);
      assert.match(res.error, /Missing SMTP configuration/);
    });

    it("calls transporter.verify() and reports success when connection works", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";

      let verifyCalled = false;
      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        verify: async () => {
          verifyCalled = true;
          return true;
        },
      });

      try {
        resetTransporterForTesting();
        const res = await verifySmtpConnection();
        assert.equal(res.success, true);
        assert.equal(verifyCalled, true);
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });

    it("handles and returns error safely if SMTP verify fails", async () => {
      process.env.SMTP_HOST = "smtp.test.local";
      process.env.SMTP_USER = "mailer@test.local";
      process.env.SMTP_PASS = "secret";

      const originalCreateTransport = nodemailer.createTransport;
      nodemailer.createTransport = () => ({
        verify: async () => {
          throw new Error("535 5.7.8 Authentication credentials invalid");
        },
      });

      try {
        resetTransporterForTesting();
        const res = await verifySmtpConnection();
        assert.equal(res.success, false);
        assert.equal(res.error, "535 5.7.8 Authentication credentials invalid");
      } finally {
        nodemailer.createTransport = originalCreateTransport;
      }
    });
  });
});
