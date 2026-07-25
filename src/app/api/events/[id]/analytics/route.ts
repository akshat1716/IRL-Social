import { NextRequest, NextResponse } from "next/server";
import { getEventAnalytics } from "@/lib/actions/events";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const analytics = await getEventAnalytics(params.id);
  if (!analytics) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  return NextResponse.json(analytics);
}
