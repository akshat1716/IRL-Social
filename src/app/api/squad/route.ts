import { NextRequest, NextResponse } from "next/server";
import { createSquadPassCheckout, getSquadByCode } from "@/lib/actions/tickets";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createSquadPassCheckout({
      event_id: body.event_id,
      tier_id: body.tier_id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create squad" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const squad = await getSquadByCode(code);
  if (!squad) {
    return NextResponse.json({ error: "Squad not found" }, { status: 404 });
  }

  return NextResponse.json(squad);
}
