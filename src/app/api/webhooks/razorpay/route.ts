import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/payments";
import { finalizePaidOrderInternal } from "@/lib/server/tickets-internal";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!signature) {
      console.error("Webhook rejected: missing x-razorpay-signature header");
      return NextResponse.json(
        { error: "Missing x-razorpay-signature header" },
        { status: 400 }
      );
    }

    if (!webhookSecret || webhookSecret.startsWith("irl_webhook_secret")) {
      if (process.env.NODE_ENV === "production") {
        console.error("Webhook error: RAZORPAY_WEBHOOK_SECRET not properly configured");
        return NextResponse.json(
          { error: "Webhook secret not configured on server" },
          { status: 500 }
        );
      }
    }

    // Verify webhook signature with constant-time comparison
    const isValid = verifyWebhookSignature({
      rawBody,
      signature,
      webhookSecret: webhookSecret || "",
    });

    if (!isValid) {
      console.error("Webhook signature verification failed");
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      );
    }

    const event = JSON.parse(rawBody);
    const adminClient = createAdminClient();

    // 1. Reconcile paid events (payment.captured or order.paid)
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;

      if (orderId) {
        const { data: order } = await adminClient
          .from("payment_orders")
          .select("id")
          .eq("razorpay_order_id", orderId)
          .maybeSingle();

        if (order) {
          // Atomically finalize order & issue passes (or recover existing passes if already processed)
          await finalizePaidOrderInternal(order.id, paymentId);
        }
      }
    }

    // 2. Reconcile failed events (payment.failed)
    if (event.event === "payment.failed") {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        await adminClient
          .from("payment_orders")
          .update({
            status: "failed",
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId)
          .eq("status", "created");
      }
    }

    return NextResponse.json({ received: true, status: "success" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook processing failed";
    console.error("Razorpay Webhook Processing Error:", err);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
