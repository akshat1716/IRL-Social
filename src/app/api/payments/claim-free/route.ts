import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { createSquadPassCheckoutInternal, hydratePassInternal } from "@/lib/actions/tickets";
import type { PassRow, TicketTierRow } from "@/types/supabase";

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { event_id, tier_id, squad_mode = false } = body;

    if (!event_id || !tier_id) {
      return NextResponse.json(
        { error: "event_id and tier_id are required" },
        { status: 400 }
      );
    }

    // Check tier details & ensure price = 0
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
        { error: "Tier does not belong to specified event" },
        { status: 400 }
      );
    }

    if (tier.price > 0) {
      return NextResponse.json(
        { error: "Paid tickets must go through payment checkout" },
        { status: 400 }
      );
    }

    if (tier.sold_count >= tier.max_quantity) {
      return NextResponse.json(
        { error: "Ticket tier is sold out" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    if (squad_mode) {
      const result = await createSquadPassCheckoutInternal({
        user_id: user.id,
        event_id,
        tier_id,
      });

      return NextResponse.json({
        success: true,
        pass: result.pass,
        share_url: result.share_url,
      });
    } else {
      // Issue 1 free pass using atomic stored procedure
      const { data: passData, error: rpcError } = await adminClient.rpc(
        "issue_pass_atomic",
        {
          p_event_id: event_id,
          p_user_id: user.id,
          p_tier_id: tier_id,
        }
      );

      if (rpcError || !passData) {
        return NextResponse.json(
          { error: rpcError?.message || "Failed to claim free pass" },
          { status: 500 }
        );
      }

      const passRow = (Array.isArray(passData) ? passData[0] : passData) as PassRow;
      const pass = await hydratePassInternal(passRow);

      return NextResponse.json({
        success: true,
        passes: [pass],
        pass,
      });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to claim free pass";
    console.error("Free Pass Claim Error:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
