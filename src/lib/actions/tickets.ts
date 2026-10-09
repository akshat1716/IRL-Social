"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  mapEvent,
  mapTicketTier,
} from "@/lib/supabase/mappers";
import type { Pass, Squad } from "@/types/database";
import type {
  EventRow,
  TicketTierRow,
  VenueRow,
} from "@/types/supabase";
import { randomBytes } from "crypto";
import { hydratePassInternal, joinSquadInternal } from "@/lib/server/tickets-internal";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Authentication required.");
  }

  return { supabase, user };
}

/**
 * Returns all passes owned by the authenticated user.
 */
export async function getUserPasses(): Promise<Pass[]> {
  try {
    const { supabase, user } = await requireUser();

    const { data, error } = await supabase
      .from("passes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("getUserPasses error:", error.message);
      return [];
    }

    return Promise.all((data ?? []).map((row) => hydratePassInternal(row)));
  } catch {
    return [];
  }
}

/**
 * Fetches squad details and event/tier metadata by share code.
 */
export async function getSquadByCode(code: string) {
  const adminClient = createAdminClient();

  const { data: squad, error } = await adminClient
    .from("squads")
    .select("*")
    .eq("share_code", code)
    .single();

  if (error || !squad) return null;

  const eventRes = await adminClient
    .from("events")
    .select("*, venues(*)")
    .eq("id", squad.event_id)
    .single();

  const { data: tier } = await adminClient
    .from("ticket_tiers")
    .select("*")
    .eq("id", squad.tier_id)
    .single();

  const eventData = eventRes.data as unknown as (EventRow & {
    venues: VenueRow | null;
  }) | null;

  return {
    ...squad,
    event: eventData
      ? mapEvent(eventData, eventData.venues)
      : undefined,
    tier: tier ? mapTicketTier(tier as TicketTierRow) : undefined,
  };
}

/**
 * Allows an authenticated user to join a squad.
 * Server-authoritative checks:
 * 1. Requires authenticated caller.
 * 2. Verifies squad exists.
 * 3. Enforces squad capacity.
 * 4. Checks if tier is paid; if paid, verifies squad creator has a verified paid order.
 */
export async function joinSquad(code: string): Promise<Pass> {
  const { user } = await requireUser();
  return joinSquadInternal(code, user.id);
}

/**
 * Returns public open squads for an event.
 */
export async function getPublicSquadsForEvent(eventId: string): Promise<Squad[]> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from("squads")
    .select("*, profiles:creator_id(name)")
    .eq("event_id", eventId);

  if (error || !data) {
    if (process.env.NODE_ENV !== "production") {
      const { mockSquads } = await import("@/lib/mock-data");
      return mockSquads.filter((s) => s.event_id === eventId);
    }
    return [];
  }

  type RawSquadJoin = {
    id: string;
    event_id: string;
    tier_id: string;
    creator_id: string;
    share_code: string;
    member_pass_ids?: string[];
    created_at: string;
    is_public?: boolean;
    skill_level?: string;
    notes?: string;
    max_members?: number;
    profiles?: { name?: string } | null;
  };

  return (data as RawSquadJoin[]).map((s) => ({
    id: s.id,
    event_id: s.event_id,
    tier_id: s.tier_id,
    creator_id: s.creator_id,
    share_code: s.share_code,
    member_pass_ids: s.member_pass_ids ?? [],
    created_at: s.created_at,
    is_public: s.is_public ?? true,
    skill_level: s.skill_level ?? "Intermediate",
    notes: s.notes ?? "Looking for players to join match",
    max_members: s.max_members ?? 4,
    creator_name: s.profiles?.name ?? "Community Player",
  }));
}

/**
 * Creates a public open squad for free tiers only.
 * Paid tier squads must be created via payment flow.
 */
export async function createPublicOpenSquad(input: {
  event_id: string;
  tier_id: string;
  skill_level?: string;
  notes?: string;
  max_members?: number;
}): Promise<{ squad: Squad; share_url: string }> {
  const { user } = await requireUser();
  const adminClient = createAdminClient();

  // Enforce free tier check
  const { data: tier } = await adminClient
    .from("ticket_tiers")
    .select("price")
    .eq("id", input.tier_id)
    .single();

  if (!tier || tier.price > 0) {
    throw new Error("Public open squads can only be created for free event tiers. For paid tiers, please purchase a squad pass.");
  }

  const shareCode = randomBytes(4).toString("hex").toUpperCase();

  const { data: squad, error } = await adminClient
    .from("squads")
    .insert({
      event_id: input.event_id,
      tier_id: input.tier_id,
      creator_id: user.id,
      share_code: shareCode,
      member_pass_ids: [],
      is_public: true,
      skill_level: input.skill_level ?? "All Levels",
      notes: input.notes ?? "Join my squad!",
      max_members: input.max_members ?? 4,
    })
    .select()
    .single();

  if (error || !squad) {
    throw new Error(error?.message || "Failed to create public squad");
  }

  return {
    squad: {
      id: squad.id,
      event_id: squad.event_id,
      tier_id: squad.tier_id,
      creator_id: squad.creator_id,
      share_code: squad.share_code,
      member_pass_ids: squad.member_pass_ids,
      created_at: squad.created_at,
      is_public: squad.is_public ?? true,
      skill_level: squad.skill_level,
      notes: squad.notes,
      max_members: squad.max_members,
    },
    share_url: `/squad/${squad.share_code}`,
  };
}
