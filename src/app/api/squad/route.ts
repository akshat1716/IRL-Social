import { NextRequest, NextResponse } from "next/server";
import { getSquadByCode } from "@/lib/actions/tickets";


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
