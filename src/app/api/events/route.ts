import { NextRequest, NextResponse } from "next/server";
import { createEvent, getEvents } from "@/lib/actions/events";
import type { EventCategory } from "@/types/database";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode");
  const category = searchParams.get("category") as EventCategory | null;

  let vibeFilter: "daytime" | "nightlife" | undefined;
  if (mode === "daytime") vibeFilter = "daytime";
  if (mode === "nightlife") vibeFilter = "nightlife";

  let events = await getEvents(vibeFilter);
  if (category) {
    events = events.filter((e) => e.category === category);
  }

  return NextResponse.json(events);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = await createEvent(body);
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create event" },
      { status: 400 }
    );
  }
}
