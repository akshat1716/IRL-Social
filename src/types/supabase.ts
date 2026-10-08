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
          created_at?: string;
          updated_at?: string;
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
            | "board_games"
            | "badminton"
            | "football";
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
      payment_orders: {
        Row: {
          id: string;
          razorpay_order_id: string;
          user_id: string;
          event_id: string;
          tier_id: string;
          quantity: number;
          amount_paise: number;
          squad_mode: boolean;
          status: "created" | "paid" | "failed";
          razorpay_payment_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["payment_orders"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          status?: "created" | "paid" | "failed";
          razorpay_payment_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["payment_orders"]["Insert"]>;
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
          is_public?: boolean;
          skill_level?: string | null;
          notes?: string | null;
          max_members?: number | null;
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
          order_id: string | null;
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
          squad_id?: string | null;
          order_id?: string | null;
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
    Views: {
      public_profiles: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          created_at: string;
        };
      };
    };
    Functions: {
      issue_pass_atomic: {
        Args: {
          p_event_id: string;
          p_user_id: string;
          p_tier_id: string;
          p_squad_id?: string | null;
          p_order_id?: string | null;
        };
        Returns: Database["public"]["Tables"]["passes"]["Row"][];
      };
      staff_can_scan_event: {
        Args: {
          p_staff_id: string;
          p_event_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}

export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type VenueRow = Database["public"]["Tables"]["venues"]["Row"];
export type EventRow = Database["public"]["Tables"]["events"]["Row"];
export type TicketTierRow = Database["public"]["Tables"]["ticket_tiers"]["Row"];
export type PaymentOrderRow = Database["public"]["Tables"]["payment_orders"]["Row"];
export type PassRow = Database["public"]["Tables"]["passes"]["Row"];
export type SquadRow = Database["public"]["Tables"]["squads"]["Row"];
export type CheckInRow = Database["public"]["Tables"]["check_ins"]["Row"];
