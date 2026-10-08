import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { isSimulationMode, verifyRazorpaySignature } from "@/lib/payments";
import {
  createSquadPassCheckoutInternal,
  hydratePassInternal,
} from "@/lib/actions/tickets";
import type { PassRow } from "@/types/supabase";

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

    // 3. Idempotency Check: if order is already paid, return already-issued passes
    if (order.status === "paid") {
      const { data: existingPassesRows } = await adminClient
        .from("passes")
        .select("*")
        .eq("order_id", order.id);

      const existingPasses = await Promise.all(
        (existingPassesRows ?? []).map((row: PassRow) => hydratePassInternal(row))
      );

      return NextResponse.json({
        success: true,
        already_paid: true,
        passes: existingPasses,
        pass: existingPasses[0] || null,
      });
    }

    if (order.status === "failed") {
      return NextResponse.json(
        { error: "This payment order has been marked as failed" },
        { status: 400 }
      );
    }

    // 4. Verification logic (simulated vs live HMAC)
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

    // 5. Mark order paid atomically
    const paymentIdToSave = razorpay_payment_id || `pay_sim_${Date.now()}`;
    const { error: updateError } = await adminClient
      .from("payment_orders")
      .update({
        status: "paid",
        razorpay_payment_id: paymentIdToSave,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id)
      .eq("status", "created");

    if (updateError) {
      console.error("Failed to update payment order status:", updateError.message);
      return NextResponse.json(
        { error: "Failed to update payment status" },
        { status: 500 }
      );
    }

    // 6. Issue passes using values stored in order
    if (order.squad_mode) {
      const result = await createSquadPassCheckoutInternal({
        user_id: user.id,
        event_id: order.event_id,
        tier_id: order.tier_id,
        order_id: order.id,
      });

      return NextResponse.json({
        success: true,
        pass: result.pass,
        share_url: result.share_url,
      });
    } else {
      const passes = [];
      for (let i = 0; i < order.quantity; i++) {
        const { data: passData, error: rpcError } = await adminClient.rpc(
          "issue_pass_atomic",
          {
            p_event_id: order.event_id,
            p_user_id: user.id,
            p_tier_id: order.tier_id,
            p_order_id: order.id,
          }
        );

        if (rpcError || !passData) {
          console.error("RPC issue_pass_atomic error:", rpcError?.message);
          throw new Error(rpcError?.message || "Failed to issue pass");
        }

        const passRow = (Array.isArray(passData) ? passData[0] : passData) as PassRow;
        const pass = await hydratePassInternal(passRow);
        passes.push(pass);
      }

      return NextResponse.json({
        success: true,
        passes,
        pass: passes[0] || null,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to verify payment and issue pass";
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
