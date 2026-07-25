"use server";

import { createClient } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    (profile.role !== "door_staff" && profile.role !== "partner")
  ) {
    throw new Error("Scanner authorization required");
  }

  return { supabase, user };
}

export async function validatePass(
  passHash: string
): Promise<ValidatePassResult> {
  try {
    const { supabase, user } = await requireScannerStaff();

    const { data: passRow, error: passError } = await supabase
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
        supabase
          .from("events")
          .select("*, venues(*), ticket_tiers(*)")
          .eq("id", passRow.event_id)
          .single(),
        supabase
          .from("ticket_tiers")
          .select("*")
          .eq("id", passRow.tier_id)
          .single(),
        supabase
          .from("profiles")
          .select("*")
          .eq("id", passRow.user_id)
          .single(),
        supabase
          .from("check_ins")
          .select("*")
          .eq("pass_id", passRow.id)
          .maybeSingle(),
      ]);

    const eventRow = eventData as EventRow & {
      venues: VenueRow | null;
      ticket_tiers: TicketTierRow[];
    } | null;

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

    const { error: checkInError } = await supabase.from("check_ins").insert({
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
  const { supabase } = await requireScannerStaff();

  const { data: passes, error } = await supabase
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
  const supabase = createClient();

  const { data, error } = await supabase
    .from("events")
    .select("id, title")
    .gte("end_time", new Date().toISOString())
    .order("start_time", { ascending: true });

  if (error) return [];
  return data ?? [];
}
