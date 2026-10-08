import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
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

/**
 * Hydrates a raw PassRow database record with full event, tier, venue, and profile relations.
 * Internal server function only.
 */
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

/**
 * Internal pass issuance function using service role to invoke issue_pass_atomic.
 * Server-only.
 */
export async function issuePassInternal(input: {
  event_id: string;
  user_id: string;
  tier_id: string;
  squad_id?: string;
  order_id?: string;
}): Promise<Pass> {
  const adminClient = createAdminClient();

  const { data: passData, error: rpcError } = await adminClient.rpc(
    "issue_pass_atomic",
    {
      p_event_id: input.event_id,
      p_user_id: input.user_id,
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
          member_pass_ids: [...(squad.member_pass_ids ?? []), passRow.id],
        })
        .eq("id", input.squad_id);
    }
  }

  return hydratePassInternal(passRow);
}

/**
 * Internal squad pass checkout creation.
 * Server-only.
 */
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

  const pass = await issuePassInternal({
    event_id: input.event_id,
    user_id: input.user_id,
    tier_id: input.tier_id,
    squad_id: squad.id,
    order_id: input.order_id,
  });

  return {
    squad: {
      id: squad.id,
      event_id: squad.event_id,
      tier_id: squad.tier_id,
      creator_id: squad.creator_id,
      share_code: squad.share_code,
      member_pass_ids: [pass.id],
      created_at: squad.created_at,
    },
    pass,
    share_url: `/squad/${squad.share_code}`,
  };
}

/**
 * Atomically finalizes a paid order and issues passes or retrieves existing passes.
 * Uses service role to call SECURITY DEFINER function finalize_paid_order.
 */
export async function finalizePaidOrderInternal(
  order_id: string,
  payment_id?: string
): Promise<Pass[]> {
  const adminClient = createAdminClient();

  const { data: passesData, error: rpcError } = await adminClient.rpc(
    "finalize_paid_order",
    {
      p_order_id: order_id,
      p_payment_id: payment_id ?? null,
    }
  );

  if (rpcError) {
    throw new Error(`Failed to finalize paid order: ${rpcError.message}`);
  }

  const rows = (passesData ?? []) as PassRow[];
  return Promise.all(rows.map((row) => hydratePassInternal(row)));
}
