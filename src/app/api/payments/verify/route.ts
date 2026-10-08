import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isSimulationMode, verifyRazorpaySignature } from "@/lib/payments";
import { finalizePaidOrderInternal } from "@/lib/server/tickets-internal";

export async function POST(req: Request) {
  try {
    // 1. Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required to verify payment" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: "razorpay_order_id is required" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // 2. Fetch order from payment_orders table for current user
    const { data: order, error: orderError } = await adminClient
      .from("payment_orders")
      .select("*")
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Payment order not found or unauthorized" },
        { status: 404 }
      );
    }

    if (order.status === "failed") {
      return NextResponse.json(
        { error: "This payment order has been marked as failed" },
        { status: 400 }
      );
    }

    // 3. Verification logic (simulated vs live HMAC)
    const isSimulatedOrder = order.razorpay_order_id.startsWith("order_sim_");
    const simulationAllowed = isSimulationMode();

    if (isSimulatedOrder) {
      if (!simulationAllowed) {
        return NextResponse.json(
          { error: "Payment simulation mode is strictly disabled in production" },
          { status: 400 }
        );
      }
    } else {
      const secret = process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        console.error("Missing RAZORPAY_KEY_SECRET in environment");
        return NextResponse.json(
          { error: "Payment gateway secret not configured on server" },
          { status: 500 }
        );
      }

      const isValid = verifyRazorpaySignature({
        razorpay_order_id,
        razorpay_payment_id: razorpay_payment_id || "",
        razorpay_signature: razorpay_signature || "",
        secret,
      });

      if (!isValid) {
        return NextResponse.json(
          { error: "Payment verification signature mismatch. Security alert." },
          { status: 400 }
        );
      }
    }

    // 4. Race-safe, atomic order finalization & pass issuance
    const paymentIdToSave = razorpay_payment_id || `pay_sim_${Date.now()}`;
    const passes = await finalizePaidOrderInternal(order.id, paymentIdToSave);

    return NextResponse.json({
      success: true,
      passes,
      pass: passes[0] || null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify payment and issue pass";
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
