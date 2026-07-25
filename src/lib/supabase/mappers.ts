import type {
  Event,
  Pass,
  TicketTier,
  User,
  Venue,
} from "@/types/database";
import type {
  EventRow,
  PassRow,
  ProfileRow,
  TicketTierRow,
  VenueRow,
} from "@/types/supabase";

export function mapVenue(row: VenueRow): Venue {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    address: row.address,
    partner_id: row.partner_id,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
  };
}

export function mapTicketTier(row: TicketTierRow): TicketTier {
  return {
    id: row.id,
    event_id: row.event_id,
    name: row.name,
    description: row.description,
    price: row.price,
    cover_redeemable_amount: row.cover_redeemable_amount,
    max_quantity: row.max_quantity,
    sold_count: row.sold_count,
  };
}

export function mapProfile(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    avatar_url: row.avatar_url,
    role: row.role,
  };
}

export function mapEvent(
  row: EventRow,
  venue?: VenueRow | null,
  tiers?: TicketTierRow[]
): Event {
  return {
    id: row.id,
    venue_id: row.venue_id,
    title: row.title,
    description: row.description,
    category: row.category,
    cover_image: row.cover_image,
    start_time: row.start_time,
    end_time: row.end_time,
    capacity: row.capacity,
    current_attendees: row.current_attendees,
    vibe_status: row.vibe_status,
    is_daytime: row.is_daytime,
    venue: venue ? mapVenue(venue) : undefined,
    ticket_tiers: tiers?.map(mapTicketTier),
  };
}

export function mapPass(
  row: PassRow,
  event?: Event,
  tier?: TicketTier,
  user?: User
): Pass {
  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    tier_id: row.tier_id,
    qr_code_hash: row.qr_code_hash,
    status: row.status,
    redeemed_amount: row.redeemed_amount,
    squad_id: row.squad_id ?? undefined,
    created_at: row.created_at,
    event,
    tier,
    user,
  };
}
