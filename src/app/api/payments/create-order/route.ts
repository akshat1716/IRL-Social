import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateOrderAmount, isSimulationMode } from "@/lib/payments";
import type { TicketTierRow } from "@/types/supabase";

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
        { error: "Authentication required to create payment order" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { event_id, tier_id, squad_mode = false } = body;
    const rawQuantity = body.quantity;

    if (!event_id || !tier_id) {
      return NextResponse.json(
        { error: "event_id and tier_id are required" },
        { status: 400 }
      );
    }

    const parsedQuantity = parseInt(rawQuantity, 10);
    const quantity = isNaN(parsedQuantity) ? 1 : parsedQuantity;

    if (quantity < 1 || quantity > 10) {
      return NextResponse.json(
        { error: "Quantity must be an integer between 1 and 10" },
        { status: 400 }
      );
    }

    // 2. Fetch ticket tier from DB and validate event ownership & stock
    const { data: tierData, error: tierError } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("id", tier_id)
      .single();

    const tier = tierData as TicketTierRow | null;

    if (tierError || !tier) {
      return NextResponse.json(
        { error: "Ticket tier not found" },
        { status: 404 }
      );
    }

    if (tier.event_id !== event_id) {
      return NextResponse.json(
        { error: "Ticket tier does not belong to specified event" },
        { status: 400 }
      );
    }

    if (tier.sold_count + (squad_mode ? 1 : quantity) > tier.max_quantity) {
      return NextResponse.json(
        { error: "Ticket tier is sold out or insufficient quantity available" },
        { status: 400 }
      );
    }

    if (tier.price === 0) {
      return NextResponse.json(
        { error: "Free passes must be claimed via /api/payments/claim-free" },
        { status: 400 }
      );
    }

    // 3. Compute amount server-side
    const { quantity: effectiveQuantity, amount_paise } = calculateOrderAmount({
      price: tier.price,
      quantity,
      squad_mode: !!squad_mode,
    });

    const isSimulated = isSimulationMode();
    let razorpay_order_id: string;
    let key_id: string = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";

    if (isSimulated) {
      razorpay_order_id = "order_sim_" + crypto.randomBytes(8).toString("hex");
      key_id = key_id || "rzp_simulated_key";
    } else {
      const key_secret = process.env.RAZORPAY_KEY_SECRET;
      if (!key_id || !key_secret) {
        console.error("Missing Razorpay credentials in environment");
        return NextResponse.json(
          { error: "Payment gateway key credentials not configured on server" },
          { status: 500 }
        );
      }

      const instance = new Razorpay({ key_id, key_secret });
      const order = await instance.orders.create({
        amount: amount_paise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        notes: {
          event_id,
          tier_id,
          user_id: user.id,
          squad_mode: squad_mode ? "true" : "false",
        },
      });

      razorpay_order_id = order.id;
    }

    // 4. Save order to payment_orders table
    const adminClient = createAdminClient();
    const { error: orderInsertError } = await adminClient
      .from("payment_orders")
      .insert({
        razorpay_order_id,
        user_id: user.id,
        event_id,
        tier_id,
        quantity: effectiveQuantity,
        amount_paise,
        squad_mode: !!squad_mode,
        status: "created",
      });

    if (orderInsertError) {
      console.error("Failed to store payment order:", orderInsertError.message);
      return NextResponse.json(
        { error: "Failed to create payment order record" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: razorpay_order_id,
      amount: amount_paise,
      currency: "INR",
      key: key_id,
      is_simulated: isSimulated,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create payment order";
    console.error("Create Order Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
