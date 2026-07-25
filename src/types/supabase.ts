export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          phone: string | null;
          avatar_url: string | null;
          role: "user" | "partner" | "door_staff";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          email?: string;
          phone?: string | null;
          avatar_url?: string | null;
          role?: "user" | "partner" | "door_staff";
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      venues: {
        Row: {
          id: string;
          name: string;
          location: string;
          address: string;
          partner_id: string;
          lat: number | null;
          lng: number | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["venues"]["Row"],
          "id" | "created_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["venues"]["Insert"]>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          venue_id: string;
          title: string;
          description: string;
          category:
            | "run_club"
            | "nightlife"
            | "karaoke"
            | "mixer"
            | "board_games";
          cover_image: string;
          start_time: string;
          end_time: string;
          capacity: number;
          current_attendees: number;
          vibe_status: "chill" | "warming_up" | "peak_vibe" | "sold_out";
          is_daytime: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["events"]["Row"],
          "id" | "current_attendees" | "created_at" | "updated_at"
        > & { id?: string; current_attendees?: number };
        Update: Partial<Database["public"]["Tables"]["events"]["Insert"]>;
        Relationships: [];
      };
      ticket_tiers: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          description: string;
          price: number;
          cover_redeemable_amount: number;
          max_quantity: number;
          sold_count: number;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["ticket_tiers"]["Row"],
          "id" | "sold_count" | "created_at"
        > & { id?: string; sold_count?: number };
        Update: Partial<Database["public"]["Tables"]["ticket_tiers"]["Insert"]>;
        Relationships: [];
      };
      squads: {
        Row: {
          id: string;
          event_id: string;
          tier_id: string;
          creator_id: string;
          share_code: string;
          member_pass_ids: string[];
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["squads"]["Row"],
          "id" | "member_pass_ids" | "created_at"
        > & { id?: string; member_pass_ids?: string[] };
        Update: Partial<Database["public"]["Tables"]["squads"]["Insert"]>;
        Relationships: [];
      };
      passes: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          tier_id: string;
          qr_code_hash: string;
          status: "valid" | "checked_in" | "cancelled";
          redeemed_amount: number;
          squad_id: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["passes"]["Row"],
          "id" | "qr_code_hash" | "created_at"
        > & {
          id?: string;
          qr_code_hash?: string;
          status?: "valid" | "checked_in" | "cancelled";
          redeemed_amount?: number;
        };
        Update: Partial<Database["public"]["Tables"]["passes"]["Insert"]>;
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          pass_id: string;
          scanned_by_staff_id: string;
          scanned_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["check_ins"]["Row"],
          "id" | "scanned_at"
        > & { id?: string };
        Update: Partial<Database["public"]["Tables"]["check_ins"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type TicketTierRow = Database["public"]["Tables"]["ticket_tiers"]["Row"];
export type PassRow = Database["public"]["Tables"]["passes"]["Row"];
export type SquadRow = Database["public"]["Tables"]["squads"]["Row"];
export type CheckInRow = Database["public"]["Tables"]["check_ins"]["Row"];
