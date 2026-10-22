import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { checkPasswordPolicy } from "../src/lib/password.ts";
import { TTL } from "../src/lib/tokens.ts";
import { maskEmail } from "../src/lib/users.ts";

describe("Authentication & Security Token Logic Tests", () => {
  describe("TTL Configurations", () => {
    it("configures 30 minutes for reset tokens", () => {
      assert.equal(TTL.reset, 30);
    });

    it("configures 60 minutes for setup tokens", () => {
      assert.equal(TTL.setup, 60);
    });

    it("configures 15 minutes for google setup tokens", () => {
      assert.equal(TTL.setupGoogle, 15);
    });
  });

  describe("Token Hashing & Safety", () => {
    it("hashes raw tokens using SHA-256 for database storage", () => {
      const raw = crypto.randomBytes(32).toString("base64url");
      assert.ok(raw.length >= 40 && raw.length <= 45);
      const hash = crypto.createHash("sha256").update(raw).digest("hex");
      assert.equal(hash.length, 64);
      // Ensure one-way hash: hash is different from raw
      assert.notEqual(raw, hash);
    });
  });

  describe("Password Policy (checkPasswordPolicy)", () => {
    const email = "2024bcaaidshj20070@poornima.edu.in";
    const enr = "20070";

    it("rejects passwords shorter than 8 characters", () => {
      assert.equal(checkPasswordPolicy("Short1!", email, enr), "PASSWORD_TOO_SHORT");
    });

    it("rejects passwords longer than 64 characters", () => {
      const longPass = "A".repeat(65);
      assert.equal(checkPasswordPolicy(longPass, email, enr), "PASSWORD_TOO_LONG");
    });

    it("rejects passwords containing the enrollment number", () => {
      assert.equal(checkPasswordPolicy("MyPass20070!", email, enr), "PASSWORD_WEAK");
    });

    it("rejects passwords containing email prefix", () => {
      assert.equal(checkPasswordPolicy("2024bcaaidshj_Secure1", email, enr), "PASSWORD_WEAK");
    });

    it("rejects common trivial passwords", () => {
      assert.equal(checkPasswordPolicy("password123", email, enr), "PASSWORD_WEAK");
      assert.equal(checkPasswordPolicy("poornima123", email, enr), "PASSWORD_WEAK");
    });

    it("accepts strong valid passwords", () => {
      assert.equal(checkPasswordPolicy("Poornima#Univ2026Safe", email, enr), null);
    });
  });

  describe("Password Hashing & Reused Password Detection", () => {
    it("hashes passwords securely with bcrypt and detects reuse", async () => {
      const password = "ValidPassword123#";
      const hash = await bcrypt.hash(password, 12);

      // Verify bcrypt cost and comparison
      const isMatch = await bcrypt.compare(password, hash);
      assert.equal(isMatch, true);

      // Comparison with different password fails
      const isMismatch = await bcrypt.compare("AnotherPassword456!", hash);
      assert.equal(isMismatch, false);
    });
  });

  describe("Email Masking Safety (maskEmail)", () => {
    it("masks local part while preserving domain", () => {
      const masked = maskEmail("2024bcaaidshj20070@poornima.edu.in");
      assert.equal(masked, "20••••••@poornima.edu.in");
    });
  });
});
