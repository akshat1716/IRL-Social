import { NextRequest, NextResponse } from "next/server";
import { getEventById } from "@/lib/actions/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const event = await getEventById(params.id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(event);
}
