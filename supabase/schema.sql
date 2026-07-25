-- IRL Social & Event Platform — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor or via `supabase db push`

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums (match src/types/database.ts)
-- ---------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('user', 'partner', 'door_staff');
CREATE TYPE event_category AS ENUM (
  'run_club', 'nightlife', 'karaoke', 'mixer', 'board_games'
);
CREATE TYPE vibe_status AS ENUM (
  'chill', 'warming_up', 'peak_vibe', 'sold_out'
);
CREATE TYPE pass_status AS ENUM ('valid', 'checked_in', 'cancelled');

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users — replaces mock Users table)
-- ---------------------------------------------------------------------------
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  phone       TEXT DEFAULT '',
  avatar_url  TEXT,
  role        user_role NOT NULL DEFAULT 'user',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Venues
-- ---------------------------------------------------------------------------
CREATE TABLE venues (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  address     TEXT NOT NULL,
  partner_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
CREATE TABLE events (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id            UUID NOT NULL REFERENCES venues(id) ON DELETE RESTRICT,
  title               TEXT NOT NULL,
  description         TEXT NOT NULL DEFAULT '',
  category            event_category NOT NULL,
  cover_image         TEXT NOT NULL DEFAULT 'club',
  start_time          TIMESTAMPTZ NOT NULL,
  end_time            TIMESTAMPTZ NOT NULL,
  capacity            INTEGER NOT NULL CHECK (capacity > 0),
  current_attendees   INTEGER NOT NULL DEFAULT 0 CHECK (current_attendees >= 0),
  vibe_status         vibe_status NOT NULL DEFAULT 'chill',
  is_daytime          BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Ticket Tiers
-- ---------------------------------------------------------------------------
CREATE TABLE ticket_tiers (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name                      TEXT NOT NULL,
  description               TEXT NOT NULL DEFAULT '',
  price                     INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
  cover_redeemable_amount   INTEGER NOT NULL DEFAULT 0 CHECK (cover_redeemable_amount >= 0),
  max_quantity              INTEGER NOT NULL CHECK (max_quantity > 0),
  sold_count                INTEGER NOT NULL DEFAULT 0 CHECK (sold_count >= 0),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sold_not_exceed_max CHECK (sold_count <= max_quantity)
);

-- ---------------------------------------------------------------------------
-- Squads (group checkout / split payment)
-- ---------------------------------------------------------------------------
CREATE TABLE squads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id        UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id         UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  creator_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  share_code      TEXT NOT NULL UNIQUE,
  member_pass_ids UUID[] NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX squads_share_code_idx ON squads(share_code);

-- ---------------------------------------------------------------------------
-- Passes
-- ---------------------------------------------------------------------------
CREATE TABLE passes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  tier_id           UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  qr_code_hash      TEXT NOT NULL UNIQUE,
  status            pass_status NOT NULL DEFAULT 'valid',
  redeemed_amount   INTEGER NOT NULL DEFAULT 0 CHECK (redeemed_amount >= 0),
  squad_id          UUID REFERENCES squads(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX passes_user_id_idx ON passes(user_id);
CREATE INDEX passes_event_id_idx ON passes(event_id);
CREATE INDEX passes_qr_code_hash_idx ON passes(qr_code_hash);

-- ---------------------------------------------------------------------------
-- Check-ins
-- ---------------------------------------------------------------------------
CREATE TABLE check_ins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_id             UUID NOT NULL REFERENCES passes(id) ON DELETE RESTRICT,
  scanned_by_staff_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  scanned_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pass_id)
);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Generate unique QR hash for passes
CREATE OR REPLACE FUNCTION generate_qr_hash()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 'IRL-PASS-' || replace(gen_random_uuid()::text, '-', '');
END;
$$;

-- Increment tier sold_count and event current_attendees on pass insert
CREATE OR REPLACE FUNCTION on_pass_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE ticket_tiers
  SET sold_count = sold_count + 1
  WHERE id = NEW.tier_id;

  UPDATE events
  SET current_attendees = current_attendees + 1,
      vibe_status = CASE
        WHEN current_attendees + 1 >= capacity THEN 'sold_out'::vibe_status
        WHEN current_attendees + 1 >= capacity * 0.8 THEN 'peak_vibe'::vibe_status
        WHEN current_attendees + 1 >= capacity * 0.5 THEN 'warming_up'::vibe_status
        ELSE vibe_status
      END
  WHERE id = NEW.event_id;

  IF NEW.qr_code_hash IS NULL OR NEW.qr_code_hash = '' THEN
    NEW.qr_code_hash := generate_qr_hash();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER pass_before_insert
  BEFORE INSERT ON passes
  FOR EACH ROW EXECUTE FUNCTION on_pass_created();

-- Mark pass as checked_in when check_in is recorded
CREATE OR REPLACE FUNCTION on_check_in_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE passes SET status = 'checked_in' WHERE id = NEW.pass_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_in_after_insert
  AFTER INSERT ON check_ins
  FOR EACH ROW EXECUTE FUNCTION on_check_in_created();

-- Role helper functions for RLS
CREATE OR REPLACE FUNCTION is_partner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('partner', 'door_staff')
  );
$$;

CREATE OR REPLACE FUNCTION is_door_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'door_staff'
  );
$$;

CREATE OR REPLACE FUNCTION is_scanner_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('door_staff', 'partner')
  );
$$;

CREATE OR REPLACE FUNCTION owns_venue(venue_partner_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT auth.uid() = venue_partner_id;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues     ENABLE ROW LEVEL SECURITY;
ALTER TABLE events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins  ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Venues: public read, partners manage own venues
CREATE POLICY "Venues are publicly readable"
  ON venues FOR SELECT USING (true);

CREATE POLICY "Partners can insert venues"
  ON venues FOR INSERT WITH CHECK (
    auth.uid() = partner_id AND is_partner()
  );

CREATE POLICY "Partners can update own venues"
  ON venues FOR UPDATE USING (owns_venue(partner_id));

-- Events: public read, partners manage events at their venues
CREATE POLICY "Events are publicly readable"
  ON events FOR SELECT USING (true);

CREATE POLICY "Partners can insert events"
  ON events FOR INSERT WITH CHECK (
    is_partner() AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_id AND v.partner_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update own venue events"
  ON events FOR UPDATE USING (
    is_partner() AND EXISTS (
      SELECT 1 FROM venues v
      WHERE v.id = venue_id AND v.partner_id = auth.uid()
    )
  );

-- Ticket tiers: public read, partners manage via event ownership
CREATE POLICY "Ticket tiers are publicly readable"
  ON ticket_tiers FOR SELECT USING (true);

CREATE POLICY "Partners can insert ticket tiers"
  ON ticket_tiers FOR INSERT WITH CHECK (
    is_partner() AND EXISTS (
      SELECT 1 FROM events e
      JOIN venues v ON v.id = e.venue_id
      WHERE e.id = event_id AND v.partner_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update ticket tiers"
  ON ticket_tiers FOR UPDATE USING (
    is_partner() AND EXISTS (
      SELECT 1 FROM events e
      JOIN venues v ON v.id = e.venue_id
      WHERE e.id = event_id AND v.partner_id = auth.uid()
    )
  );

-- Squads: public read for share_code join flow; authenticated create/update
CREATE POLICY "Squads are readable for join flow"
  ON squads FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create squads"
  ON squads FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update squad member list"
  ON squads FOR UPDATE USING (auth.uid() = creator_id);

-- Passes: owner read/write; scanner staff can read for validation
CREATE POLICY "Users can read own passes"
  ON passes FOR SELECT USING (
    auth.uid() = user_id OR is_scanner_staff()
  );

CREATE POLICY "Users can insert own passes"
  ON passes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own passes"
  ON passes FOR UPDATE USING (auth.uid() = user_id);

-- Check-ins: scanner staff insert; partners/staff read
CREATE POLICY "Scanner staff can insert check-ins"
  ON check_ins FOR INSERT WITH CHECK (is_scanner_staff());

CREATE POLICY "Scanner staff and pass owners can read check-ins"
  ON check_ins FOR SELECT USING (
    is_scanner_staff()
    OR EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_id AND p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Seed data (optional — run after creating a partner auth user)
-- Replace PARTNER_USER_ID with your Supabase auth.users UUID
-- ---------------------------------------------------------------------------
/*
INSERT INTO profiles (id, name, email, role)
VALUES ('PARTNER_USER_ID', 'Maya Chen', 'maya@venue.com', 'partner')
ON CONFLICT (id) DO UPDATE SET role = 'partner';

INSERT INTO venues (id, name, location, address, partner_id, lat, lng) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Neon Pulse Club', 'Indiranagar', '100 Feet Rd, Indiranagar, Bangalore', 'PARTNER_USER_ID', 12.9784, 77.6408),
  ('11111111-1111-1111-1111-111111111102', 'Sunrise Run Hub', 'Cubbon Park', 'Kasturba Rd, Bangalore', 'PARTNER_USER_ID', 12.9763, 77.5929),
  ('11111111-1111-1111-1111-111111111103', 'The Velvet Room', 'Koramangala', '5th Block, Koramangala, Bangalore', 'PARTNER_USER_ID', 12.9352, 77.6245),
  ('11111111-1111-1111-1111-111111111104', 'Brew & Board Café', 'HSR Layout', '27th Main, HSR Layout, Bangalore', 'PARTNER_USER_ID', 12.9116, 77.6473);
*/
