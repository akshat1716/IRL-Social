import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, event_id, tier_id, squad_mode } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
    }

    const key_id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_irl_app_2026";
    const key_secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_irl_app_2026";

    // If test keys are placeholders, return a simulated order payload for local dev fallback
    if (key_id.startsWith("rzp_test_irl_app")) {
      const simulatedOrderId = "order_sim_" + Date.now();
      return NextResponse.json({
        id: simulatedOrderId,
        amount: Math.round(amount * 100),
        currency: "INR",
        key: key_id,
        is_simulated: true,
      });
    }

    const instance = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      notes: {
        event_id: event_id || "",
        tier_id: tier_id || "",
        squad_mode: squad_mode ? "true" : "false",
      },
    };

    const order = await instance.orders.create(options);

    return NextResponse.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      key: key_id,
      is_simulated: false,
    });
  } catch (error: any) {
    console.error("Razorpay Order Creation Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
