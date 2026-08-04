import { NextResponse } from "next/server";
import crypto from "crypto";
import { createPass, createSquadPassCheckout } from "@/lib/actions/tickets";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      event_id,
      tier_id,
      squad_mode,
      quantity = 1,
      is_simulated,
    } = body;

    // Signature verification (unless in local simulation mode)
    if (!is_simulated) {
      const secret = process.env.RAZORPAY_KEY_SECRET || "";
      const generated_signature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generated_signature !== razorpay_signature) {
        return NextResponse.json(
          { error: "Payment verification signature mismatch. Security alert." },
          { status: 400 }
        );
      }
    }

    // Payment is verified! Create pass / squad pass.
    if (squad_mode) {
      const result = await createSquadPassCheckout({
        event_id,
        tier_id,
      });
      return NextResponse.json({
        success: true,
        pass: result.pass,
        share_url: result.share_url,
      });
    } else {
      const passes = [];
      for (let i = 0; i < quantity; i++) {
        const pass = await createPass({
          event_id,
          tier_id,
        });
        passes.push(pass);
      }
      return NextResponse.json({
        success: true,
        passes,
      });
    }
  } catch (error: any) {
    console.error("Razorpay Verification Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to verify payment and issue pass" },
      { status: 500 }
    );
  }
}
