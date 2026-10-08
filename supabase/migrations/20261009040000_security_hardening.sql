-- IRL Social & Event Platform — Security Hardening Migration
-- Migration Timestamp: 20261009040000
-- Idempotent script safe to run on live Supabase databases

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Payment Orders Table (ISSUE 1)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_orders (
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

CREATE INDEX IF NOT EXISTS payment_orders_user_id_idx ON payment_orders(user_id);
CREATE INDEX IF NOT EXISTS payment_orders_razorpay_order_id_idx ON payment_orders(razorpay_order_id);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own payment orders" ON payment_orders;
CREATE POLICY "Users can read own payment orders"
  ON payment_orders FOR SELECT
  USING (auth.uid() = user_id);

-- Add order_id column to passes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'passes' AND column_name = 'order_id'
  ) THEN
    ALTER TABLE passes ADD COLUMN order_id UUID REFERENCES payment_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Restrict Client Pass Creation & Modification (ISSUE 2)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own passes" ON passes;
DROP POLICY IF EXISTS "Users can update own passes" ON passes;

-- Retain ONLY SELECT policy for passes
DROP POLICY IF EXISTS "Users can read own passes" ON passes;
CREATE POLICY "Users can read own passes"
  ON passes FOR SELECT USING (
    auth.uid() = user_id OR is_scanner_staff()
  );

-- ---------------------------------------------------------------------------
-- 3. Prevent Self-Promotion of Profile Roles & Protect Privileged Columns (ISSUE 3)
-- ---------------------------------------------------------------------------
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
  FOR EACH ROW
  EXECUTE FUNCTION prevent_profile_role_escalation();

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

-- ---------------------------------------------------------------------------
-- 4. Protect Profile Email Privacy & Create public_profiles View (ISSUE 4)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile or scanner staff can view attendee" ON profiles;

CREATE POLICY "Users can view own profile or scanner staff can view attendee"
  ON profiles FOR SELECT USING (
    auth.uid() = id OR is_scanner_staff()
  );

CREATE OR REPLACE VIEW public_profiles AS
SELECT
  id,
  name,
  avatar_url,
  created_at
FROM profiles;

GRANT SELECT ON public_profiles TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Atomic Pass Issuance with Row Locking & Overselling Protection (ISSUE 6)
-- ---------------------------------------------------------------------------
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
  -- Lock the ticket_tier row for update
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

  -- Insert pass. Trigger on_pass_created will increment sold_count & current_attendees automatically.
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

-- ---------------------------------------------------------------------------
-- 6. Scanner Staff Event & Venue Scope Check (ISSUE 7)
-- ---------------------------------------------------------------------------
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
