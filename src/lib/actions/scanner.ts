"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  mapEvent,
  mapPass,
  mapProfile,
  mapTicketTier,
} from "@/lib/supabase/mappers";
import type { Pass } from "@/types/database";
import type {
  EventRow,
  PassRow,
  ProfileRow,
  TicketTierRow,
  VenueRow,
} from "@/types/supabase";

export type ValidatePassStatus = "VALID" | "ALREADY_SCANNED" | "INVALID";

export interface ValidatePassResult {
  status: ValidatePassStatus;
  message: string;
  pass?: Pass;
  scanned_at?: string;
}

async function requireScannerStaff() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Authentication required");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const profile = profileData as { role: string } | null;

  if (
    !profile ||
    (profile.role !== "door_staff" && profile.role !== "partner")
  ) {
    throw new Error("Scanner authorization required");
  }

  return { user, role: profile.role };
}

export async function validatePass(
  passHash: string
): Promise<ValidatePassResult> {
  try {
    const { user, role } = await requireScannerStaff();
    const adminClient = createAdminClient();

    const { data: passRow, error: passError } = await adminClient
      .from("passes")
      .select("*")
      .eq("qr_code_hash", passHash)
      .single();

    if (passError || !passRow) {
      return { status: "INVALID", message: "Pass not found" };
    }

    if (passRow.status === "cancelled") {
      return { status: "INVALID", message: "Pass has been cancelled" };
    }

    const [{ data: eventData }, { data: tier }, { data: profile }, { data: existingCheckIn }] =
      await Promise.all([
        adminClient
          .from("events")
          .select("*, venues(*), ticket_tiers(*)")
          .eq("id", passRow.event_id)
          .single(),
        adminClient
          .from("ticket_tiers")
          .select("*")
          .eq("id", passRow.tier_id)
          .single(),
        adminClient
          .from("profiles")
          .select("*")
          .eq("id", passRow.user_id)
          .single(),
        adminClient
          .from("check_ins")
          .select("*")
          .eq("pass_id", passRow.id)
          .maybeSingle(),
      ]);

    const eventRow = eventData as EventRow & {
      venues: VenueRow | null;
      ticket_tiers: TicketTierRow[];
    } | null;

    // Venue ownership check for partners: partner can only scan passes for their own venue
    if (role === "partner" && eventRow?.venues) {
      if (eventRow.venues.partner_id !== user.id) {
        return {
          status: "INVALID",
          message: "Unauthorized: You can only scan passes for your own venue events",
        };
      }
    }

    const hydratedPass = mapPass(
      passRow,
      eventRow
        ? mapEvent(eventRow, eventRow.venues, eventRow.ticket_tiers)
        : undefined,
      tier ? mapTicketTier(tier) : undefined,
      profile ? mapProfile(profile as ProfileRow) : undefined
    );

    if (passRow.status === "checked_in" || existingCheckIn) {
      return {
        status: "ALREADY_SCANNED",
        message: "ALREADY SCANNED",
        pass: hydratedPass,
        scanned_at: existingCheckIn?.scanned_at,
      };
    }

    // Insert check-in atomically
    const { error: checkInError } = await adminClient.from("check_ins").insert({
      pass_id: passRow.id,
      scanned_by_staff_id: user.id,
    });

    if (checkInError) {
      if (checkInError.code === "23505") {
        return {
          status: "ALREADY_SCANNED",
          message: "ALREADY SCANNED",
          pass: hydratedPass,
        };
      }
      console.error("check_in insert error:", checkInError.message);
      return { status: "INVALID", message: "Failed to record check-in" };
    }

    return {
      status: "VALID",
      message: "ACCESS GRANTED",
      pass: { ...hydratedPass, status: "checked_in" },
    };
  } catch (err) {
    return {
      status: "INVALID",
      message: err instanceof Error ? err.message : "Validation failed",
    };
  }
}

export async function getEventPassesForCache(eventId: string) {
  const { user, role } = await requireScannerStaff();
  const adminClient = createAdminClient();

  if (role === "partner") {
    const { data: event } = await adminClient
      .from("events")
      .select("*, venues(*)")
      .eq("id", eventId)
      .single();

    const venuePartnerId = (event as unknown as { venues?: { partner_id?: string } | null })?.venues?.partner_id;
    if (venuePartnerId !== user.id) {
      return [];
    }
  }

  const { data: passes, error } = await adminClient
    .from("passes")
    .select("*, profiles(*), ticket_tiers(*)")
    .eq("event_id", eventId);

  if (error) {
    console.error("getEventPassesForCache error:", error.message);
    return [];
  }

  type PassWithRelations = PassRow & {
    profiles: ProfileRow | null;
    ticket_tiers: TicketTierRow | null;
  };

  const passesList = (passes ?? []) as unknown as PassWithRelations[];

  return passesList.map((p) => ({
    qr_code_hash: p.qr_code_hash,
    pass_id: p.id,
    event_id: p.event_id,
    tier_name: p.ticket_tiers?.name ?? "Unknown",
    user_name: p.profiles?.name ?? "Guest",
    status: p.status,
    cached_at: new Date().toISOString(),
  }));
}

export async function getEventsForScanner() {
  const { user, role } = await requireScannerStaff();
  const adminClient = createAdminClient();

  const query = adminClient
    .from("events")
    .select("id, title, venue_id, venues(partner_id)")
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  const { data, error } = await query;
  if (error || !data) return [];

  type EventScannerItem = {
    id: string;
    title: string;
    venues?: { partner_id?: string } | { partner_id?: string }[] | null;
  };

  const items = data as unknown as EventScannerItem[];

  if (role === "partner") {
    return items
      .filter((e) => {
        const v = Array.isArray(e.venues) ? e.venues[0] : e.venues;
        return v?.partner_id === user.id;
      })
      .map(({ id, title }) => ({ id, title }));
  }

  return items.map(({ id, title }) => ({ id, title }));
}
