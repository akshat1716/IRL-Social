import { NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "irl_webhook_secret_2026";

    // Verify webhook signature
    if (signature && webhookSecret && !webhookSecret.startsWith("irl_webhook_secret")) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      if (expectedSignature !== signature) {
        console.error("Webhook signature verification failed");
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    }

    const event = JSON.parse(rawBody);

    // Handle payment.captured event
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const payment = event.payload?.payment?.entity;
      const orderNotes = payment?.notes || {};

      console.log("Razorpay Payment Captured:", {
        payment_id: payment?.id,
        amount: payment?.amount ? payment.amount / 100 : 0,
        email: payment?.email,
        phone: payment?.contact,
        notes: orderNotes,
      });

      // Ticket generation logic for webhook background processing
    }

    return NextResponse.json({ received: true, status: "success" });
  } catch (err: any) {
    console.error("Razorpay Webhook Processing Error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
