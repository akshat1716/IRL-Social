import { NextRequest, NextResponse } from "next/server";
import { createPass, getUserPasses } from "@/lib/actions/tickets";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("event_id");

  if (eventId) {
    const supabase = createClient();
    const { data: passes } = await supabase
      .from("passes")
      .select("*")
      .eq("event_id", eventId);
    return NextResponse.json(passes ?? []);
  }

  const passes = await getUserPasses();
  return NextResponse.json(passes);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pass = await createPass({
      event_id: body.event_id,
      tier_id: body.tier_id,
      squad_id: body.squad_id,
    });

    return NextResponse.json(pass, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create pass" },
      { status: 400 }
    );
  }
}
