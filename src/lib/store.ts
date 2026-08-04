import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { EventCategory } from "@/types/database";

export type FeedMode = "daytime" | "nightlife";

interface AppState {
  feedMode: FeedMode;
  setFeedMode: (mode: FeedMode) => void;
  currentUserId: string;
  setCurrentUserId: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      feedMode: "daytime",
      setFeedMode: (mode) => set({ feedMode: mode }),
      currentUserId: "user-1",
      setCurrentUserId: (id) => set({ currentUserId: id }),
    }),
    { name: "irl-app-store" }
  )
);

interface CheckoutState {
  selectedTierId: string | null;
  quantity: number;
  squadMode: boolean;
  setSelectedTier: (tierId: string | null) => void;
  setQuantity: (qty: number) => void;
  setSquadMode: (enabled: boolean) => void;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  selectedTierId: null,
  quantity: 1,
  squadMode: false,
  setSelectedTier: (tierId) => set({ selectedTierId: tierId }),
  setQuantity: (qty) => set({ quantity: qty }),
  setSquadMode: (enabled) => set({ squadMode: enabled }),
  reset: () =>
    set({ selectedTierId: null, quantity: 1, squadMode: false }),
}));

export const categoryLabels: Record<EventCategory, string> = {
  badminton: "Badminton",
  football: "Turf Football",
  pickleball: "Pickleball",
  cricket: "Box Cricket",
  basketball: "Basketball",
  run_club: "Run Club",
  board_games: "Board Games",
  sports: "Sports & Fitness",
  nightlife: "Nightlife",
  karaoke: "Karaoke",
  mixer: "Social Mixer",
};

export const MATCHMAKING_CATEGORIES: EventCategory[] = [
  "badminton",
  "football",
  "pickleball",
  "cricket",
  "basketball",
  "run_club",
  "board_games",
  "sports",
];

export function isMatchmakingCategory(category?: EventCategory): boolean {
  if (!category) return false;
  return MATCHMAKING_CATEGORIES.includes(category);
}

export const vibeLabels = {
  chill: { label: "Chill Vibe", color: "text-cyan-400" },
  warming_up: { label: "Warming Up", color: "text-yellow-400" },
  peak_vibe: { label: "Peak Vibe", color: "text-lime-400" },
  sold_out: { label: "Sold Out", color: "text-red-400" },
} as const;
