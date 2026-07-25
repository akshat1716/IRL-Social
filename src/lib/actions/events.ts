"use server";

import { createClient } from "@/lib/supabase/server";
import { mapEvent, mapTicketTier, mapVenue } from "@/lib/supabase/mappers";
import type { Event, EventCategory } from "@/types/database";
import type {
  CheckInRow,
  EventRow,
  PassRow,
  ProfileRow,
  TicketTierRow,
  VenueRow,
} from "@/types/supabase";

type EventWithRelations = EventRow & {
  venues: VenueRow | null;
  ticket_tiers: TicketTierRow[];
};

function toEvent(row: EventWithRelations): Event {
  return mapEvent(row, row.venues, row.ticket_tiers);
}

export async function getEvents(
  vibe?: "daytime" | "nightlife"
): Promise<Event[]> {
  const supabase = createClient();

  let query = supabase
    .from("events")
    .select("*, venues(*), ticket_tiers(*)")
    .order("start_time", { ascending: true });

  if (vibe === "daytime") {
    query = query.eq("is_daytime", true);
  } else if (vibe === "nightlife") {
    query = query.eq("is_daytime", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("getEvents error:", error.message);
    return [];
  }

  return (data as EventWithRelations[]).map(toEvent);
}

export async function getEventById(id: string): Promise<Event | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select("*, venues(*), ticket_tiers(*)")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error("getEventById error:", error?.message);
    return null;
  }

  return toEvent(data as EventWithRelations);
}

export async function getEventsByCategory(
  category?: EventCategory
): Promise<Event[]> {
  const events = await getEvents();
  if (!category) return events;
  return events.filter((e) => e.category === category);
}

export async function getVenues() {
  const supabase = createClient();
  const { data, error } = await supabase.from("venues").select("*");

  if (error) {
    console.error("getVenues error:", error.message);
    return [];
  }

  return (data ?? []).map(mapVenue);
}

export async function getEventAnalytics(eventId: string) {
  const supabase = createClient();
  const event = await getEventById(eventId);
  if (!event) return null;

  const { data: passesData } = await supabase
    .from("passes")
    .select("*, ticket_tiers(*)")
    .eq("event_id", eventId);

  const passesList = (passesData ?? []) as unknown as (PassRow & {
    ticket_tiers: TicketTierRow | null;
  })[];

  const passIds = passesList.map((p) => p.id);

  const { data: checkInsData } = await supabase
    .from("check_ins")
    .select("*, passes(*, profiles(*))")
    .in(
      "pass_id",
      passIds.length > 0 ? passIds : ["00000000-0000-0000-0000-000000000000"]
    );

  type CheckInWithPass = CheckInRow & {
    passes:
      | (PassRow & {
          profiles: ProfileRow | null;
          ticket_tiers: TicketTierRow | null;
        })
      | null;
  };

  const checkInsList = (checkInsData ?? []) as unknown as CheckInWithPass[];

  const tierBreakdown = event.ticket_tiers?.map((tier) => {
    const tierPasses = passesList.filter((p) => p.tier_id === tier.id);
    return {
      tier,
      sold: tierPasses.length,
      revenue: tierPasses.length * tier.price,
    };
  });

  const revenue =
    tierBreakdown?.reduce((sum, t) => sum + t.revenue, 0) ?? 0;

  return {
    event,
    totalPasses: passesList.length,
    checkedIn: checkInsList.length,
    capacityPercent: Math.round(
      (event.current_attendees / event.capacity) * 100
    ),
    tierBreakdown,
    revenue,
    recentCheckIns: checkInsList.slice(-10).map((c) => ({
      id: c.id,
      pass_id: c.pass_id,
      scanned_by_staff_id: c.scanned_by_staff_id,
      scanned_at: c.scanned_at,
      pass: c.passes
        ? {
            user: c.passes.profiles
              ? {
                  name: c.passes.profiles.name,
                }
              : undefined,
            tier: c.passes.ticket_tiers
              ? mapTicketTier(c.passes.ticket_tiers)
              : undefined,
          }
        : undefined,
    })),
  };
}

export async function createEvent(input: {
  title: string;
  description: string;
  category: EventCategory;
  venue_id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  is_daytime: boolean;
  cover_image: string;
  tiers: {
    name: string;
    description: string;
    price: number;
    cover_redeemable_amount: number;
    max_quantity: number;
  }[];
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");

  const { data: event, error: eventError } = await supabase
    .from("events")
    .insert({
      title: input.title,
      description: input.description,
      category: input.category,
      venue_id: input.venue_id,
      start_time: new Date(input.start_time).toISOString(),
      end_time: new Date(input.end_time).toISOString(),
      capacity: input.capacity,
      is_daytime: input.is_daytime,
      cover_image: input.cover_image,
      vibe_status: "chill",
    })
    .select()
    .single();

  if (eventError || !event) {
    throw new Error(eventError?.message ?? "Failed to create event");
  }

  const createdEvent = event as unknown as EventRow;

  const tierRows = input.tiers.map((tier) => ({
    event_id: createdEvent.id,
    name: tier.name,
    description: tier.description,
    price: tier.price,
    cover_redeemable_amount: tier.cover_redeemable_amount,
    max_quantity: tier.max_quantity,
  }));

  const { error: tierError } = await supabase
    .from("ticket_tiers")
    .insert(tierRows);

  if (tierError) {
    throw new Error(tierError.message);
  }

  return getEventById(createdEvent.id);
}
