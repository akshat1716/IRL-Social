import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "crypto";
import {
  calculateOrderAmount,
  isSimulationMode,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from "@/lib/payments";

describe("Payment Security Helpers", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("calculateOrderAmount", () => {
    it("should calculate correct amount in paise for valid tier price and quantity", () => {
      const result = calculateOrderAmount({ price: 299, quantity: 2 });
      expect(result.quantity).toBe(2);
      expect(result.amount_paise).toBe(59800); // 299 * 2 * 100
    });

    it("should handle free tiers (price = 0) with amount = 0", () => {
      const result = calculateOrderAmount({ price: 0, quantity: 5 });
      expect(result.quantity).toBe(5);
      expect(result.amount_paise).toBe(0);
    });

    it("should enforce quantity = 1 for squad mode", () => {
      const result = calculateOrderAmount({ price: 999, quantity: 4, squad_mode: true });
      expect(result.quantity).toBe(1);
      expect(result.amount_paise).toBe(99900);
    });

    it("should throw an error for negative prices", () => {
      expect(() => calculateOrderAmount({ price: -100, quantity: 1 })).toThrow(
        "Invalid tier price"
      );
    });
  });

  describe("isSimulationMode", () => {
    it("should return true when PAYMENTS_MODE=simulated in non-production", () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
      process.env.PAYMENTS_MODE = "simulated";
      expect(isSimulationMode()).toBe(true);
    });

    it("should HARD DISABLE simulation mode when NODE_ENV=production regardless of PAYMENTS_MODE", () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
      process.env.PAYMENTS_MODE = "simulated";
      expect(isSimulationMode()).toBe(false);
    });

    it("should return false when PAYMENTS_MODE=live", () => {
      Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
      process.env.PAYMENTS_MODE = "live";
      expect(isSimulationMode()).toBe(false);
    });
  });

  describe("verifyRazorpaySignature", () => {
    const secret = "test_secret_key_1234567890";
    const order_id = "order_12345";
    const payment_id = "pay_67890";

    const validSignature = crypto
      .createHmac("sha256", secret)
      .update(`${order_id}|${payment_id}`)
      .digest("hex");

    it("should return true for a valid signature", () => {
      const isValid = verifyRazorpaySignature({
        razorpay_order_id: order_id,
        razorpay_payment_id: payment_id,
        razorpay_signature: validSignature,
        secret,
      });
      expect(isValid).toBe(true);
    });

    it("should return false for a tampered signature", () => {
      const isValid = verifyRazorpaySignature({
        razorpay_order_id: order_id,
        razorpay_payment_id: payment_id,
        razorpay_signature: validSignature.slice(0, -2) + "ff",
        secret,
      });
      expect(isValid).toBe(false);
    });

    it("should return false when inputs are missing", () => {
      expect(
        verifyRazorpaySignature({
          razorpay_order_id: "",
          razorpay_payment_id: payment_id,
          razorpay_signature: validSignature,
          secret,
        })
      ).toBe(false);
    });
  });

  describe("verifyWebhookSignature", () => {
    const webhookSecret = "whsec_secret_key_abcdef";
    const rawBody = JSON.stringify({ event: "payment.captured", payload: {} });

    const validSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(rawBody)
      .digest("hex");

    it("should return true for valid webhook signature", () => {
      const isValid = verifyWebhookSignature({
        rawBody,
        signature: validSignature,
        webhookSecret,
      });
      expect(isValid).toBe(true);
    });

    it("should return false for tampered body or invalid signature", () => {
      const isValid = verifyWebhookSignature({
        rawBody: rawBody + " ",
        signature: validSignature,
        webhookSecret,
      });
      expect(isValid).toBe(false);
    });

    it("should return false when secret is empty", () => {
      expect(
        verifyWebhookSignature({
          rawBody,
          signature: validSignature,
          webhookSecret: "",
        })
      ).toBe(false);
    });
  });
});
