import { v4 as uuidv4 } from "uuid";
import type {
  CheckIn,
  Event,
  Pass,
  Squad,
  TicketTier,
  User,
  Venue,
} from "@/types/database";

export const mockUsers: User[] = [
  {
    id: "user-1",
    name: "Alex Rivera",
    email: "alex@example.com",
    phone: "+91 98765 43210",
    avatar_url: null,
    role: "user",
  },
  {
    id: "partner-1",
    name: "Maya Chen",
    email: "maya@venue.com",
    phone: "+91 98765 11111",
    avatar_url: null,
    role: "partner",
  },
  {
    id: "staff-1",
    name: "Jordan Lee",
    email: "jordan@venue.com",
    phone: "+91 98765 22222",
    avatar_url: null,
    role: "door_staff",
  },
];

export const mockVenues: Venue[] = [
  {
    id: "venue-1",
    name: "Paddles & Latte",
    location: "Gomti Nagar",
    address: "Gomti Nagar, Lucknow, Uttar Pradesh 226010",
    partner_id: "partner-1",
    lat: 26.8500,
    lng: 80.9990,
  },
];

export const mockEvents: Event[] = [
  {
    id: "event-1",
    venue_id: "venue-2",
    title: "Sunday Sunrise Run Club",
    description:
      "Join 200+ runners for a 5K through Cubbon Park. Post-run coffee & networking included.",
    category: "run_club",
    cover_image: "run",
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    capacity: 250,
    current_attendees: 175,
    vibe_status: "warming_up",
    is_daytime: true,
  },
  {
    id: "event-2",
    venue_id: "venue-4",
    title: "Coffee Mixer & Board Games",
    description:
      "Meet new people over specialty coffee and classic board games. Perfect for introverts too.",
    category: "mixer",
    cover_image: "coffee",
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 86400000 + 10800000).toISOString(),
    capacity: 40,
    current_attendees: 28,
    vibe_status: "chill",
    is_daytime: true,
  },
  {
    id: "event-3",
    venue_id: "venue-1",
    title: "Neon Nights: DJ Set",
    description:
      "Bangalore's hottest DJ night with neon visuals, craft cocktails, and VIP tables.",
    category: "nightlife",
    cover_image: "club",
    start_time: new Date(Date.now() + 86400000 * 3).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 3 + 18000000).toISOString(),
    capacity: 500,
    current_attendees: 350,
    vibe_status: "peak_vibe",
    is_daytime: false,
  },
  {
    id: "event-4",
    venue_id: "venue-3",
    title: "Karaoke Chaos Friday",
    description:
      "Grab the mic and sing your heart out. Private booths and group sessions available.",
    category: "karaoke",
    cover_image: "karaoke",
    start_time: new Date(Date.now() + 86400000 * 4).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 4 + 14400000).toISOString(),
    capacity: 80,
    current_attendees: 56,
    vibe_status: "warming_up",
    is_daytime: false,
  },
  {
    id: "event-5",
    venue_id: "venue-1",
    title: "Indie Gig Night",
    description:
      "Live performances from 3 rising indie bands. Early bird passes include drink tokens.",
    category: "nightlife",
    cover_image: "gig",
    start_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 5 + 14400000).toISOString(),
    capacity: 200,
    current_attendees: 200,
    vibe_status: "sold_out",
    is_daytime: false,
  },
  {
    id: "event-6",
    venue_id: "venue-4",
    title: "Board Game Battle Royale",
    description:
      "Catan, Codenames, and more. Teams of 4 compete for prizes and bragging rights.",
    category: "board_games",
    cover_image: "board",
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 2 + 7200000).toISOString(),
    capacity: 32,
    current_attendees: 18,
    vibe_status: "chill",
    is_daytime: true,
  },
  {
    id: "event-7",
    venue_id: "venue-5",
    title: "Badminton Doubles Open Match (2v2)",
    description:
      "Join or host open badminton doubles matches. Feather shuttles provided. Looking for intermediate players!",
    category: "badminton",
    cover_image: "coffee",
    start_time: new Date(Date.now() + 86400000 * 1).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 1 + 7200000).toISOString(),
    capacity: 16,
    current_attendees: 10,
    vibe_status: "warming_up",
    is_daytime: true,
    is_matchmaking_enabled: true,
    skill_level: "intermediate",
    equipment_provided: "Yonex Mavis 350 Shuttles provided. Bring your racquet.",
    max_squad_size: 4,
  },
  {
    id: "event-8",
    venue_id: "venue-6",
    title: "5v5 Night Turf Football Challenge",
    description:
      "Casual 5-a-side floodlight football game. Split pitch fees with your open squad mates!",
    category: "football",
    cover_image: "run",
    start_time: new Date(Date.now() + 86400000 * 2).toISOString(),
    end_time: new Date(Date.now() + 86400000 * 2 + 5400000).toISOString(),
    capacity: 20,
    current_attendees: 14,
    vibe_status: "peak_vibe",
    is_daytime: false,
    is_matchmaking_enabled: true,
    skill_level: "all",
    equipment_provided: "Size 5 Match Football & Colored Bibs provided.",
    max_squad_size: 10,
  },
];

export const mockTicketTiers: TicketTier[] = [
  {
    id: "tier-1",
    event_id: "event-1",
    name: "Free RSVP",
    description: "Entry only, no cover redeemable",
    price: 0,
    cover_redeemable_amount: 0,
    max_quantity: 100,
    sold_count: 75,
  },
  {
    id: "tier-2",
    event_id: "event-1",
    name: "Run + Coffee Pass",
    description: "Entry + ₹200 café credit",
    price: 299,
    cover_redeemable_amount: 200,
    max_quantity: 150,
    sold_count: 100,
  },
  {
    id: "tier-3",
    event_id: "event-2",
    name: "Free RSVP",
    description: "Entry only",
    price: 0,
    cover_redeemable_amount: 0,
    max_quantity: 20,
    sold_count: 15,
  },
  {
    id: "tier-4",
    event_id: "event-2",
    name: "Coffee Pass",
    description: "Entry + ₹300 café credit",
    price: 399,
    cover_redeemable_amount: 300,
    max_quantity: 20,
    sold_count: 13,
  },
  {
    id: "tier-5",
    event_id: "event-3",
    name: "Stag Pass",
    description: "Entry + ₹500 bar credit",
    price: 999,
    cover_redeemable_amount: 500,
    max_quantity: 300,
    sold_count: 200,
  },
  {
    id: "tier-6",
    event_id: "event-3",
    name: "Couple Pass",
    description: "2 entries + ₹1200 bar credit",
    price: 1799,
    cover_redeemable_amount: 1200,
    max_quantity: 100,
    sold_count: 80,
  },
  {
    id: "tier-7",
    event_id: "event-3",
    name: "VIP Table",
    description: "Table for 6 + ₹5000 bar credit + bottle service",
    price: 14999,
    cover_redeemable_amount: 5000,
    max_quantity: 10,
    sold_count: 7,
  },
  {
    id: "tier-8",
    event_id: "event-4",
    name: "Stag Pass",
    description: "Entry + 2 drink tokens",
    price: 699,
    cover_redeemable_amount: 400,
    max_quantity: 50,
    sold_count: 35,
  },
  {
    id: "tier-9",
    event_id: "event-4",
    name: "Couple Pass",
    description: "2 entries + 5 drink tokens",
    price: 1199,
    cover_redeemable_amount: 800,
    max_quantity: 30,
    sold_count: 21,
  },
  {
    id: "tier-10",
    event_id: "event-5",
    name: "Early Bird",
    description: "Entry + 1 drink token",
    price: 499,
    cover_redeemable_amount: 200,
    max_quantity: 100,
    sold_count: 100,
  },
  {
    id: "tier-11",
    event_id: "event-6",
    name: "Free RSVP",
    description: "Entry only",
    price: 0,
    cover_redeemable_amount: 0,
    max_quantity: 16,
    sold_count: 10,
  },
  {
    id: "tier-12",
    event_id: "event-6",
    name: "Game Master Pass",
    description: "Entry + snacks + priority seating",
    price: 499,
    cover_redeemable_amount: 300,
    max_quantity: 16,
    sold_count: 8,
  },
  {
    id: "tier-13",
    event_id: "event-7",
    name: "Player Slot (Split Court Fee)",
    description: "Court booking + Mavis 350 shuttles included",
    price: 250,
    cover_redeemable_amount: 0,
    max_quantity: 16,
    sold_count: 10,
  },
  {
    id: "tier-14",
    event_id: "event-8",
    name: "Turf Football Slot",
    description: "Full pitch lights + bibs & match balls included",
    price: 350,
    cover_redeemable_amount: 0,
    max_quantity: 20,
    sold_count: 14,
  },
];

export const mockPasses: Pass[] = [
  {
    id: "pass-1",
    event_id: "event-3",
    user_id: "user-1",
    tier_id: "tier-5",
    qr_code_hash: "IRL-PASS-abc123def456",
    status: "valid",
    redeemed_amount: 0,
    created_at: new Date().toISOString(),
  },
];

export const mockCheckIns: CheckIn[] = [];
export const mockSquads: Squad[] = [
  {
    id: "sq-101",
    event_id: "event-7",
    tier_id: "tier-13",
    creator_id: "user-1",
    share_code: "BADM44",
    member_pass_ids: ["pass-1", "pass-2"],
    created_at: new Date().toISOString(),
    is_public: true,
    skill_level: "Intermediate (3.5+)",
    notes: "Looking for 2 players for 2v2 doubles! Friendly match.",
    max_members: 4,
    creator_name: "Rohan & Dev",
  },
  {
    id: "sq-102",
    event_id: "event-7",
    tier_id: "tier-13",
    creator_id: "partner-1",
    share_code: "SMASH9",
    member_pass_ids: ["pass-3"],
    created_at: new Date().toISOString(),
    is_public: true,
    skill_level: "Beginner Friendly",
    notes: "Need 3 players for casual rallies & doubles.",
    max_members: 4,
    creator_name: "Ananya",
  },
  {
    id: "sq-103",
    event_id: "event-8",
    tier_id: "tier-14",
    creator_id: "user-1",
    share_code: "FOOT55",
    member_pass_ids: ["pass-1", "pass-2", "pass-3", "pass-4", "pass-5", "pass-6"],
    created_at: new Date().toISOString(),
    is_public: true,
    skill_level: "All Levels Welcome",
    notes: "Need 4 players to complete 5v5 team roster!",
    max_members: 10,
    creator_name: "Koramangala Strikers",
  },
];

function generateQrHash(): string {
  return `IRL-PASS-${uuidv4().replace(/-/g, "").slice(0, 12)}`;
}

class MockDatabase {
  users = [...mockUsers];
  venues = [...mockVenues];
  events = [...mockEvents];
  ticketTiers = [...mockTicketTiers];
  passes = [...mockPasses];
  checkIns = [...mockCheckIns];
  squads = [...mockSquads];

  getEventWithDetails(eventId: string) {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return null;
    const venue = this.venues.find((v) => v.id === event.venue_id);
    const ticket_tiers = this.ticketTiers.filter((t) => t.event_id === eventId);
    return { ...event, venue, ticket_tiers };
  }

  getEvents(filters?: { is_daytime?: boolean; category?: string }) {
    let filtered = [...this.events];
    if (filters?.is_daytime !== undefined) {
      filtered = filtered.filter((e) => e.is_daytime === filters.is_daytime);
    }
    if (filters?.category) {
      filtered = filtered.filter((e) => e.category === filters.category);
    }
    return filtered
      .map((event) => this.getEventWithDetails(event.id)!)
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      );
  }

  getPassWithDetails(passId: string) {
    const pass = this.passes.find((p) => p.id === passId);
    if (!pass) return null;
    const event = this.getEventWithDetails(pass.event_id) ?? undefined;
    const tier = this.ticketTiers.find((t) => t.id === pass.tier_id);
    const user = this.users.find((u) => u.id === pass.user_id);
    return { ...pass, event, tier, user };
  }

  getUserPasses(userId: string) {
    return this.passes
      .filter((p) => p.user_id === userId)
      .map((p) => this.getPassWithDetails(p.id)!)
      .filter(Boolean);
  }

  createPass(data: {
    event_id: string;
    user_id: string;
    tier_id: string;
    squad_id?: string;
  }) {
    const tier = this.ticketTiers.find((t) => t.id === data.tier_id);
    if (!tier) throw new Error("Tier not found");
    if (tier.sold_count >= tier.max_quantity)
      throw new Error("Tier sold out");

    const pass: Pass = {
      id: `pass-${uuidv4().slice(0, 8)}`,
      event_id: data.event_id,
      user_id: data.user_id,
      tier_id: data.tier_id,
      qr_code_hash: generateQrHash(),
      status: "valid",
      redeemed_amount: 0,
      squad_id: data.squad_id,
      created_at: new Date().toISOString(),
    };

    this.passes.push(pass);
    tier.sold_count += 1;

    const event = this.events.find((e) => e.id === data.event_id);
    if (event) event.current_attendees += 1;

    return this.getPassWithDetails(pass.id)!;
  }

  createSquad(data: {
    event_id: string;
    tier_id: string;
    creator_id: string;
  }) {
    const squad: Squad = {
      id: `squad-${uuidv4().slice(0, 8)}`,
      event_id: data.event_id,
      tier_id: data.tier_id,
      creator_id: data.creator_id,
      share_code: uuidv4().slice(0, 8).toUpperCase(),
      member_pass_ids: [],
      created_at: new Date().toISOString(),
    };
    this.squads.push(squad);
    return squad;
  }

  createEvent(data: Omit<Event, "id" | "current_attendees"> & { tiers: Omit<TicketTier, "id" | "event_id" | "sold_count">[] }) {
    const eventId = `event-${uuidv4().slice(0, 8)}`;
    const event: Event = {
      id: eventId,
      venue_id: data.venue_id,
      title: data.title,
      description: data.description,
      category: data.category,
      cover_image: data.cover_image,
      start_time: new Date(data.start_time).toISOString(),
      end_time: new Date(data.end_time).toISOString(),
      capacity: data.capacity,
      current_attendees: 0,
      vibe_status: data.vibe_status,
      is_daytime: data.is_daytime,
    };
    this.events.push(event);

    for (const tier of data.tiers) {
      this.ticketTiers.push({
        id: `tier-${uuidv4().slice(0, 8)}`,
        event_id: eventId,
        ...tier,
        sold_count: 0,
      });
    }

    return this.getEventWithDetails(eventId)!;
  }

  validatePass(qrHash: string, staffId: string): {
    result: "granted" | "already_scanned" | "invalid";
    pass?: Pass;
    scanned_at?: string;
    message?: string;
  } {
    const pass = this.passes.find((p) => p.qr_code_hash === qrHash);
    if (!pass) {
      return { result: "invalid", message: "Pass not found" };
    }
    if (pass.status === "cancelled") {
      return { result: "invalid", message: "Pass has been cancelled" };
    }
    if (pass.status === "checked_in") {
      const checkIn = this.checkIns.find((c) => c.pass_id === pass.id);
      return {
        result: "already_scanned",
        pass: this.getPassWithDetails(pass.id)!,
        scanned_at: checkIn?.scanned_at,
      };
    }

    pass.status = "checked_in";
    const checkIn: CheckIn = {
      id: `checkin-${uuidv4().slice(0, 8)}`,
      pass_id: pass.id,
      scanned_by_staff_id: staffId,
      scanned_at: new Date().toISOString(),
    };
    this.checkIns.push(checkIn);

    return {
      result: "granted",
      pass: this.getPassWithDetails(pass.id)!,
    };
  }

  getEventAnalytics(eventId: string) {
    const event = this.getEventWithDetails(eventId);
    if (!event) return null;

    const eventPasses = this.passes.filter((p) => p.event_id === eventId);
    const checkIns = this.checkIns.filter((c) =>
      eventPasses.some((p) => p.id === c.pass_id)
    );

    const tierBreakdown = event.ticket_tiers?.map((tier) => ({
      tier,
      sold: eventPasses.filter((p) => p.tier_id === tier.id).length,
      revenue: eventPasses.filter((p) => p.tier_id === tier.id).length * tier.price,
    }));

    const revenue = tierBreakdown?.reduce((sum, t) => sum + t.revenue, 0) ?? 0;

    return {
      event,
      totalPasses: eventPasses.length,
      checkedIn: checkIns.length,
      capacityPercent: Math.round(
        (event.current_attendees / event.capacity) * 100
      ),
      tierBreakdown,
      revenue,
      recentCheckIns: checkIns.slice(-10).map((c) => ({
        ...c,
        pass: this.getPassWithDetails(c.pass_id),
      })),
    };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var mockDb: MockDatabase | undefined;
}

export const db = globalThis.mockDb ?? new MockDatabase();
if (process.env.NODE_ENV !== "production") globalThis.mockDb = db;
