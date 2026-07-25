export type UserRole = "user" | "partner" | "door_staff";

export type EventCategory =
  | "run_club"
  | "nightlife"
  | "karaoke"
  | "mixer"
  | "board_games";

export type VibeStatus = "chill" | "warming_up" | "peak_vibe" | "sold_out";

export type PassStatus = "valid" | "checked_in" | "cancelled";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  role: UserRole;
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  address: string;
  partner_id: string;
  lat?: number;
  lng?: number;
}

export interface Event {
  id: string;
  venue_id: string;
  title: string;
  description: string;
  category: EventCategory;
  cover_image: string;
  start_time: string;
  end_time: string;
  capacity: number;
  current_attendees: number;
  vibe_status: VibeStatus;
  is_daytime: boolean;
  venue?: Venue;
  ticket_tiers?: TicketTier[];
}

export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description: string;
  price: number;
  cover_redeemable_amount: number;
  max_quantity: number;
  sold_count: number;
}

export interface Pass {
  id: string;
  event_id: string;
  user_id: string;
  tier_id: string;
  qr_code_hash: string;
  status: PassStatus;
  redeemed_amount: number;
  squad_id?: string;
  created_at: string;
  event?: Event;
  tier?: TicketTier;
  user?: User;
}

export interface CheckIn {
  id: string;
  pass_id: string;
  scanned_by_staff_id: string;
  scanned_at: string;
}

export interface Squad {
  id: string;
  event_id: string;
  tier_id: string;
  creator_id: string;
  share_code: string;
  member_pass_ids: string[];
  created_at: string;
}

export type ScanResult =
  | { status: "granted"; pass: Pass }
  | { status: "already_scanned"; pass: Pass; scanned_at: string }
  | { status: "invalid"; message: string };
