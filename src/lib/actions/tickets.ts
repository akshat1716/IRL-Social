"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  mapEvent,
  mapPass,
  mapProfile,
  mapTicketTier,
} from "@/lib/supabase/mappers";
import type { Pass, Squad } from "@/types/database";
import type {
  EventRow,
  PassRow,
  ProfileRow,
  TicketTierRow,
  VenueRow,
} from "@/types/supabase";
import { randomBytes } from "crypto";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Please sign in to complete checkout.");
  }

  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!existingProfile) {
    const adminClient = createAdminClient();
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: user.id,
        name: user.user_metadata?.name || user.email?.split("@")[0] || "User",
        email: user.email || "",
        avatar_url: user.user_metadata?.avatar_url || null,
        role: "user",
      },
      { onConflict: "id" }
    );

    if (profileError) {
      console.error("Failed to ensure profile record:", profileError.message);
    }
  }

  return { supabase, user };
}

export async function hydratePassInternal(row: PassRow): Promise<Pass> {
  const adminClient = createAdminClient();

  const [{ data: eventData }, { data: tier }, { data: profile }] =
    await Promise.all([
      adminClient
        .from("events")
        .select("*, venues(*), ticket_tiers(*)")
        .eq("id", row.event_id)
        .single(),
      adminClient.from("ticket_tiers").select("*").eq("id", row.tier_id).single(),
      adminClient.from("profiles").select("*").eq("id", row.user_id).single(),
    ]);

  const eventRow = eventData as EventRow & {
    venues: VenueRow | null;
    ticket_tiers: TicketTierRow[];
  } | null;

  return mapPass(
    row,
    eventRow
      ? mapEvent(eventRow, eventRow.venues, eventRow.ticket_tiers)
      : undefined,
    tier ? mapTicketTier(tier) : undefined,
    profile ? mapProfile(profile as ProfileRow) : undefined
  );
}

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

export async function createPass(input: {
  event_id: string;
  tier_id: string;
  squad_id?: string;
  order_id?: string;
}): Promise<Pass> {
  const { user } = await requireUser();
  const adminClient = createAdminClient();

  const { data: passData, error: rpcError } = await adminClient.rpc(
    "issue_pass_atomic",
    {
      p_event_id: input.event_id,
      p_user_id: user.id,
      p_tier_id: input.tier_id,
      p_squad_id: input.squad_id ?? null,
      p_order_id: input.order_id ?? null,
    }
  );

  if (rpcError || !passData) {
    throw new Error(rpcError?.message ?? "Failed to issue pass");
  }

  const passRow = (Array.isArray(passData) ? passData[0] : passData) as PassRow;

  if (input.squad_id) {
    const { data: squad } = await adminClient
      .from("squads")
      .select("member_pass_ids")
      .eq("id", input.squad_id)
      .single();

    if (squad) {
      await adminClient
        .from("squads")
        .update({
          member_pass_ids: [...squad.member_pass_ids, passRow.id],
        })
        .eq("id", input.squad_id);
    }
  }

  return hydratePassInternal(passRow);
}

export async function createSquadPassCheckoutInternal(input: {
  user_id: string;
  event_id: string;
  tier_id: string;
  order_id?: string;
}): Promise<{ squad: Squad; pass: Pass; share_url: string }> {
  const adminClient = createAdminClient();
  const shareCode = randomBytes(4).toString("hex").toUpperCase();

  const { data: squad, error: squadError } = await adminClient
    .from("squads")
    .insert({
      event_id: input.event_id,
      tier_id: input.tier_id,
      creator_id: input.user_id,
      share_code: shareCode,
      member_pass_ids: [],
    })
    .select()
    .single();

  if (squadError || !squad) {
    throw new Error(squadError?.message ?? "Failed to create squad");
  }

  const { data: passData, error: rpcError } = await adminClient.rpc(
    "issue_pass_atomic",
    {
      p_event_id: input.event_id,
      p_user_id: input.user_id,
      p_tier_id: input.tier_id,
      p_squad_id: squad.id,
      p_order_id: input.order_id ?? null,
    }
  );

  if (rpcError || !passData) {
    throw new Error(rpcError?.message ?? "Failed to issue squad pass");
  }

  const passRow = (Array.isArray(passData) ? passData[0] : passData) as PassRow;

  await adminClient
    .from("squads")
    .update({ member_pass_ids: [passRow.id] })
    .eq("id", squad.id);

  const pass = await hydratePassInternal(passRow);

  return {
    squad: {
      id: squad.id,
      event_id: squad.event_id,
      tier_id: squad.tier_id,
      creator_id: squad.creator_id,
      share_code: squad.share_code,
      member_pass_ids: [passRow.id],
      created_at: squad.created_at,
    },
    pass,
    share_url: `/squad/${squad.share_code}`,
  };
}

export async function createSquadPassCheckout(input: {
  event_id: string;
  tier_id: string;
}): Promise<{ squad: Squad; pass: Pass; share_url: string }> {
  const { user } = await requireUser();
  return createSquadPassCheckoutInternal({
    user_id: user.id,
    event_id: input.event_id,
    tier_id: input.tier_id,
  });
}

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

export async function joinSquad(code: string): Promise<Pass> {
  const squad = await getSquadByCode(code);
  if (!squad) throw new Error("Squad not found");

  return createPass({
    event_id: squad.event_id,
    tier_id: squad.tier_id,
    squad_id: squad.id,
  });
}

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

export async function createPublicOpenSquad(input: {
  event_id: string;
  tier_id: string;
  skill_level?: string;
  notes?: string;
  max_members?: number;
}): Promise<{ squad: Squad; share_url: string }> {
  const { user } = await requireUser();
  const adminClient = createAdminClient();
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
