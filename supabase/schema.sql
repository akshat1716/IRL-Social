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
  'run_club', 'nightlife', 'karaoke', 'mixer', 'board_games', 'badminton', 'football'
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

-- Public profile view without sensitive email/phone
CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  name,
  avatar_url,
  created_at
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

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
-- Payment Orders
-- ---------------------------------------------------------------------------
CREATE TABLE payment_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razorpay_order_id   TEXT UNIQUE NOT NULL,
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  event_id            UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  tier_id             UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  quantity            INTEGER NOT NULL CHECK (quantity > 0),
  amount_paise        INTEGER NOT NULL CHECK (amount_paise >= 0),
  squad_mode          BOOLEAN NOT NULL DEFAULT false,
  status              TEXT NOT NULL CHECK (status IN ('created', 'paid', 'failed')) DEFAULT 'created',
  razorpay_payment_id TEXT UNIQUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_orders_user_id_idx ON payment_orders(user_id);
CREATE INDEX payment_orders_razorpay_order_id_idx ON payment_orders(razorpay_order_id);

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
  order_id          UUID REFERENCES payment_orders(id) ON DELETE SET NULL,
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
-- Helper functions & triggers
-- ---------------------------------------------------------------------------

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, name, email, avatar_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.email, ''),
    NEW.raw_user_meta_data->>'avatar_url',
    'user'::user_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = CASE WHEN profiles.name = '' THEN EXCLUDED.name ELSE profiles.name END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Prevent users from modifying their own role via client update
CREATE OR REPLACE FUNCTION prevent_profile_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF current_setting('role', true) IS DISTINCT FROM 'service_role'
       AND current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      RAISE EXCEPTION 'Unauthorized attempt to change profile role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_profile_role_change ON profiles;
CREATE TRIGGER check_profile_role_change
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_profile_role_escalation();

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

DROP TRIGGER IF EXISTS pass_before_insert ON passes;
CREATE TRIGGER pass_before_insert
  BEFORE INSERT ON passes
  FOR EACH ROW EXECUTE FUNCTION on_pass_created();

-- Atomic Pass Creation Function with overselling prevention
CREATE OR REPLACE FUNCTION issue_pass_atomic(
  p_event_id UUID,
  p_user_id UUID,
  p_tier_id UUID,
  p_squad_id UUID DEFAULT NULL,
  p_order_id UUID DEFAULT NULL
)
RETURNS SETOF passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sold INT;
  v_max INT;
  v_new_pass passes;
BEGIN
  SELECT sold_count, max_quantity INTO v_sold, v_max
  FROM ticket_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found';
  END IF;

  IF v_sold >= v_max THEN
    RAISE EXCEPTION 'Tier sold out';
  END IF;

  INSERT INTO passes (
    event_id,
    user_id,
    tier_id,
    squad_id,
    order_id,
    status,
    redeemed_amount
  ) VALUES (
    p_event_id,
    p_user_id,
    p_tier_id,
    p_squad_id,
    p_order_id,
    'valid',
    0
  ) RETURNING * INTO v_new_pass;

  RETURN NEXT v_new_pass;
END;
$$;

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

DROP TRIGGER IF EXISTS check_in_after_insert ON check_ins;
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

CREATE OR REPLACE FUNCTION staff_can_scan_event(p_staff_id UUID, p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM events e
    JOIN venues v ON v.id = e.venue_id
    JOIN profiles p ON p.id = p_staff_id
    WHERE e.id = p_event_id
      AND p.role IN ('door_staff', 'partner')
      AND (v.partner_id = p_staff_id OR p.role = 'door_staff')
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tiers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE squads        ENABLE ROW LEVEL SECURITY;
ALTER TABLE passes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins     ENABLE ROW LEVEL SECURITY;

-- Profiles: Restrict email SELECT, allow owner or scanner staff to read profile
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or scanner staff can view attendee" ON profiles;
CREATE POLICY "Users can view own profile or scanner staff can view attendee"
  ON profiles FOR SELECT USING (
    auth.uid() = id OR is_scanner_staff()
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Venues
CREATE POLICY "Venues are publicly readable"
  ON venues FOR SELECT USING (true);

CREATE POLICY "Partners can insert venues"
  ON venues FOR INSERT WITH CHECK (
    auth.uid() = partner_id AND is_partner()
  );

CREATE POLICY "Partners can update own venues"
  ON venues FOR UPDATE USING (owns_venue(partner_id));

-- Events
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

-- Ticket Tiers
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

-- Payment Orders
CREATE POLICY "Users can read own payment orders"
  ON payment_orders FOR SELECT USING (auth.uid() = user_id);

-- Squads
CREATE POLICY "Squads are readable for join flow"
  ON squads FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create squads"
  ON squads FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creator can update squad member list"
  ON squads FOR UPDATE USING (auth.uid() = creator_id);

-- Passes: owner read; scanner staff can read for validation. NO CLIENT INSERT / UPDATE!
CREATE POLICY "Users can read own passes"
  ON passes FOR SELECT USING (
    auth.uid() = user_id OR is_scanner_staff()
  );

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
-- Atomic Order Finalization & Function Lockdowns
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION finalize_paid_order(
  p_order_id UUID,
  p_payment_id TEXT DEFAULT NULL
)
RETURNS SETOF passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order payment_orders;
  v_pass passes;
  i INT;
  v_squad squads;
  v_share_code TEXT;
BEGIN
  SELECT * INTO v_order
  FROM payment_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'paid' THEN
    RETURN QUERY
    SELECT * FROM passes
    WHERE order_id = p_order_id;
    RETURN;
  END IF;

  UPDATE payment_orders
  SET status = 'paid',
      razorpay_payment_id = COALESCE(p_payment_id, razorpay_payment_id),
      updated_at = now()
  WHERE id = p_order_id;

  IF v_order.squad_mode THEN
    v_share_code := upper(encode(gen_random_bytes(4), 'hex'));

    INSERT INTO squads (
      event_id,
      tier_id,
      creator_id,
      share_code,
      member_pass_ids
    ) VALUES (
      v_order.event_id,
      v_order.tier_id,
      v_order.user_id,
      v_share_code,
      '{}'
    ) RETURNING * INTO v_squad;

    FOR v_pass IN
      SELECT * FROM issue_pass_atomic(
        v_order.event_id,
        v_order.user_id,
        v_order.tier_id,
        v_squad.id,
        v_order.id
      )
    LOOP
      UPDATE squads
      SET member_pass_ids = ARRAY[v_pass.id]
      WHERE id = v_squad.id;

      RETURN NEXT v_pass;
    END LOOP;
  ELSE
    FOR i IN 1..v_order.quantity LOOP
      FOR v_pass IN
        SELECT * FROM issue_pass_atomic(
          v_order.event_id,
          v_order.user_id,
          v_order.tier_id,
          NULL,
          v_order.id
        )
      LOOP
        RETURN NEXT v_pass;
      END LOOP;
    END LOOP;
  END IF;

  RETURN;
END;
$$;

-- Function Execution Lockdowns (Service-Role Only)
REVOKE EXECUTE ON FUNCTION issue_pass_atomic(UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_pass_atomic(UUID, UUID, UUID, UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION finalize_paid_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_paid_order(UUID, TEXT) TO service_role;

REVOKE EXECUTE ON FUNCTION staff_can_scan_event(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION staff_can_scan_event(UUID, UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prevent_profile_role_escalation() TO service_role;

