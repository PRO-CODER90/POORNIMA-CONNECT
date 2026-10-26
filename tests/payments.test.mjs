import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { verifyPaymentSignature, verifyWebhookSignature, createRazorpayOrder, refundRazorpayPayment, razorpayConfig, RazorpayError } from "../src/cafe/lib/razorpay.ts";

const sign = (secret, data) => crypto.createHmac("sha256", secret).update(data).digest("hex");

describe("razorpay", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
    process.env.RAZORPAY_KEY_SECRET = "s3cret";
  });

  it("accepts a correct checkout signature and rejects tampering", () => {
    const sig = sign("s3cret", "order_1|pay_1");
    assert.equal(verifyPaymentSignature("order_1", "pay_1", sig, "s3cret"), true);
    assert.equal(verifyPaymentSignature("order_1", "pay_2", sig, "s3cret"), false, "another payment id");
    assert.equal(verifyPaymentSignature("order_2", "pay_1", sig, "s3cret"), false, "another order id");
    assert.equal(verifyPaymentSignature("order_1", "pay_1", sig, "wrong"), false, "wrong secret");
    assert.equal(verifyPaymentSignature("order_1", "pay_1", "zz", "s3cret"), false, "garbage");
    assert.equal(verifyPaymentSignature("order_1", "pay_1", sig, ""), false, "no secret configured");
  });

  it("verifies webhook bodies byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } } });
    assert.equal(verifyWebhookSignature(body, sign("wh", body), "wh"), true);
    assert.equal(verifyWebhookSignature(body + " ", sign("wh", body), "wh"), false);
    assert.equal(verifyWebhookSignature(body, sign("wh", body), ""), false);
  });

  it("is off without keys", () => {
    delete process.env.RAZORPAY_KEY_SECRET;
    assert.equal(razorpayConfig().enabled, false);
  });

  it("creates orders in paise with basic auth, and refunds by payment id", async () => {
    const calls = [];
    const fake = async (url, init) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ id: url.includes("refund") ? "rfnd_1" : "order_X", amount: 4000, currency: "INR", status: "created" }), { status: 200 });
    };
    const o = await createRazorpayOrder(4000, "PU-C1-20261026-0001", { orderId: "o1" }, fake);
    assert.equal(o.id, "order_X");
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/orders");
    assert.equal(calls[0].init.headers.Authorization, "Basic " + Buffer.from("rzp_test_abc:s3cret").toString("base64"));
    assert.deepEqual(JSON.parse(calls[0].init.body), { amount: 4000, currency: "INR", receipt: "PU-C1-20261026-0001", notes: { orderId: "o1" } });
  });

  it("refunds only captured payments, with an empty (full-refund) body", async () => {
    const calls = [];
    const fakeFor = (status, refunded = 0) => async (url, init) => {
      calls.push({ url, init });
      if (init.method === "GET") return new Response(JSON.stringify({ id: "pay_1", status, amount: 2000, amount_refunded: refunded }), { status: 200 });
      return new Response(JSON.stringify({ id: "rfnd_1" }), { status: 200 });
    };
    assert.deepEqual(await refundRazorpayPayment("pay_1", fakeFor("captured")), { id: "rfnd_1", outcome: "refunded" });
    assert.equal(calls[0].url, "https://api.razorpay.com/v1/payments/pay_1");
    assert.equal(calls[1].url, "https://api.razorpay.com/v1/payments/pay_1/refund");
    assert.equal(calls[1].init.body, "{}");
    calls.length = 0;
    assert.equal((await refundRazorpayPayment("pay_1", fakeFor("authorized"))).outcome, "auto_released");
    assert.equal((await refundRazorpayPayment("pay_1", fakeFor("captured", 2000))).outcome, "already_refunded");
    assert.equal(calls.filter((c) => c.url.endsWith("/refund")).length, 0, "no refund call when not needed");
  });

  it("surfaces Razorpay errors", async () => {
    const fake = async () => new Response(JSON.stringify({ error: { description: "Authentication failed" } }), { status: 401 });
    await assert.rejects(createRazorpayOrder(100, "r", {}, fake), (e) => e instanceof RazorpayError && e.status === 401 && /Authentication failed/.test(e.message));
  });
});
