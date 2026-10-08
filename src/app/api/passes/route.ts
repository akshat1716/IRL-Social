import { NextRequest, NextResponse } from "next/server";
import { getUserPasses } from "@/lib/actions/tickets";
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

