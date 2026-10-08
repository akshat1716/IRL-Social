import crypto from "crypto";

/**
 * Checks whether payment simulation mode is enabled.
 * Simulation mode is strictly disabled when NODE_ENV === "production".
 */
export function isSimulationMode(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return process.env.PAYMENTS_MODE === "simulated";
}

/**
 * Computes payment total amount in paise from tier price (in INR) and quantity.
 */
export function calculateOrderAmount({
  price,
  quantity = 1,
  squad_mode = false,
}: {
  price: number;
  quantity?: number;
  squad_mode?: boolean;
}): { quantity: number; amount_paise: number } {
  if (price < 0) {
    throw new Error("Invalid tier price");
  }

  const effectiveQuantity = squad_mode ? 1 : Math.max(1, Math.floor(quantity));
  const amount_paise = Math.round(price * effectiveQuantity * 100);

  return {
    quantity: effectiveQuantity,
    amount_paise,
  };
}

/**
 * Constant-time Razorpay payment HMAC signature verification.
 */
export function verifyRazorpaySignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  secret,
}: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  secret: string;
}): boolean {
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !secret) {
    return false;
  }

  const generated_signature = crypto
    .createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const sigBuffer = Buffer.from(razorpay_signature, "utf8");
  const genBuffer = Buffer.from(generated_signature, "utf8");

  if (sigBuffer.length !== genBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, genBuffer);
}

/**
 * Constant-time Razorpay Webhook HMAC signature verification.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  webhookSecret,
}: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const sigBuffer = Buffer.from(signature, "utf8");
  const expBuffer = Buffer.from(expectedSignature, "utf8");

  if (sigBuffer.length !== expBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuffer, expBuffer);
}
