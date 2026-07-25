import { NextResponse } from "next/server";
import { getVenues } from "@/lib/actions/events";

export async function GET() {
  const venues = await getVenues();
  return NextResponse.json(venues);
}
