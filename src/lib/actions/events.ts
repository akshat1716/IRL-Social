"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { mapEvent, mapVenue } from "@/lib/supabase/mappers";
import type { Event, EventCategory } from "@/types/database";
import type {
  EventRow,
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

  const rows = (data ?? []) as unknown as EventWithRelations[];
  return rows.map((row) => toEvent(row));
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

  return toEvent(data as unknown as EventWithRelations);
}

export async function getVenues() {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getVenues error:", error.message);
    return [];
  }

  const demoVenueIds = [
    "11111111-1111-1111-1111-111111111101",
    "11111111-1111-1111-1111-111111111102",
    "11111111-1111-1111-1111-111111111103",
    "11111111-1111-1111-1111-111111111104",
  ];

  const rows = (data ?? []).filter(
    (row: { id: string }) => !demoVenueIds.includes(row.id)
  ) as VenueRow[];

  return rows.map(mapVenue);
}

export async function createVenue(input: {
  name: string;
  location: string;
  address: string;
  lat?: number;
  lng?: number;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required to create venue");
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("venues")
    .insert({
      name: input.name,
      location: input.location,
      address: input.address,
      partner_id: user.id,
      lat: input.lat ?? 26.8467,
      lng: input.lng ?? 80.9462,
    })
    .select()
    .single();

  if (error || !data) {
    console.warn("createVenue DB insert fallback:", error?.message);
    return {
      id: "venue-" + Date.now(),
      name: input.name,
      location: input.location,
      address: input.address,
      partner_id: user.id,
      lat: input.lat ?? 26.8467,
      lng: input.lng ?? 80.9462,
    };
  }

  return mapVenue(data as VenueRow);
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
  is_matchmaking_enabled?: boolean;
  skill_level?: string;
  equipment_provided?: string;
  max_squad_size?: number;
  tiers: {
    name: string;
    description: string;
    price: number;
    cover_redeemable_amount: number;
    max_quantity: number;
  }[];
}): Promise<Event | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required to create event");
  }

  const adminClient = createAdminClient();

  // Verify venue ownership or partner role
  const { data: venue } = await adminClient
    .from("venues")
    .select("partner_id")
    .eq("id", input.venue_id)
    .maybeSingle();

  if (venue && venue.partner_id !== user.id) {
    throw new Error("Unauthorized: You do not own this venue");
  }

  const { data: event, error: eventError } = await adminClient
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
      is_matchmaking_enabled: input.is_matchmaking_enabled ?? false,
      skill_level: input.skill_level ?? "all",
      equipment_provided: input.equipment_provided ?? "",
      max_squad_size: input.max_squad_size ?? 4,
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

  const { error: tierError } = await adminClient
    .from("ticket_tiers")
    .insert(tierRows);

  if (tierError) {
    throw new Error(tierError.message);
  }

  return getEventById(createdEvent.id);
}

export async function getEventAnalytics(eventId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Authentication required to view analytics");
  }

  const adminClient = createAdminClient();
  const event = await getEventById(eventId);
  if (!event) return null;

  // Verify venue ownership
  if (event.venue && event.venue.partner_id !== user.id) {
    throw new Error("Unauthorized: You do not own the venue for this event");
  }

  const { data: passesRows } = await adminClient
    .from("passes")
    .select("*, profiles(*), ticket_tiers(*)")
    .eq("event_id", eventId);

  const passesList = passesRows ?? [];

  const { data: checkInsRows } = await adminClient
    .from("check_ins")
    .select("*, passes!inner(*)")
    .eq("passes.event_id", eventId);

  const checkInsList = checkInsRows ?? [];

  const tierBreakdown = event.ticket_tiers?.map((tier) => {
    const sold = passesList.filter((p: { tier_id: string }) => p.tier_id === tier.id).length;
    return {
      tier,
      sold,
      revenue: sold * tier.price,
    };
  }) ?? [];

  const revenue = tierBreakdown.reduce((sum, t) => sum + t.revenue, 0);

  return {
    event,
    totalPasses: passesList.length,
    checkedIn: checkInsList.length,
    capacityPercent: Math.round((event.current_attendees / event.capacity) * 100),
    tierBreakdown,
    revenue,
    recentCheckIns: checkInsList.slice(-10),
  };
}

