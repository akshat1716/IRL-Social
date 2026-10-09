-- IRL Social & Event Platform — Scoped Access, Partner Applications & Atomic Squad Join Migration
-- Migration Timestamp: 20261009180000
-- Idempotent script safe to run on live Supabase databases

-- ---------------------------------------------------------------------------
-- 1. Partner Applications Table (ISSUE 1: Prevent Self-Promotion)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner_applications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own partner application" ON partner_applications;
CREATE POLICY "Users can read own partner application"
  ON partner_applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own partner application" ON partner_applications;
CREATE POLICY "Users can insert own partner application"
  ON partner_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. Event Staff Table & Scoped Access Functions (ISSUE 2: Scope Scanner/Partner Access)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_staff (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  staff_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, staff_id)
);

ALTER TABLE event_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Event staff mapping readable by assigned staff or venue owner" ON event_staff;
CREATE POLICY "Event staff mapping readable by assigned staff or venue owner"
  ON event_staff FOR SELECT
  USING (
    auth.uid() = staff_id OR EXISTS (
      SELECT 1 FROM events e
      JOIN venues v ON v.id = e.venue_id
      WHERE e.id = event_id AND v.partner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION staff_can_access_event(p_event_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM events e
    JOIN venues v ON v.id = e.venue_id
    WHERE e.id = p_event_id AND v.partner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM event_staff es
    WHERE es.event_id = p_event_id AND es.staff_id = auth.uid()
  );
$$;

REVOKE EXECUTE ON FUNCTION staff_can_access_event(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION staff_can_access_event(UUID) TO service_role;

-- Update RLS Policies for Scoped Access

-- Profiles SELECT: Restricted to own profile only. Partner/staff view public attendee info via public_profiles view.
DROP POLICY IF EXISTS "Users can view own profile or scanner staff can view attendee" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (
    auth.uid() = id
  );

-- Passes SELECT: Owner read OR event-scoped staff read.
DROP POLICY IF EXISTS "Users can read own passes" ON passes;
DROP POLICY IF EXISTS "Passes readable by owner or event staff" ON passes;
CREATE POLICY "Passes readable by owner or event staff"
  ON passes FOR SELECT USING (
    auth.uid() = user_id OR staff_can_access_event(event_id)
  );

-- Check-ins INSERT & SELECT: Scoped strictly to event staff.
DROP POLICY IF EXISTS "Scanner staff can insert check-ins" ON check_ins;
DROP POLICY IF EXISTS "Event staff can insert check-ins" ON check_ins;
CREATE POLICY "Event staff can insert check-ins"
  ON check_ins FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_id AND staff_can_access_event(p.event_id)
    )
  );

DROP POLICY IF EXISTS "Scanner staff and pass owners can read check-ins" ON check_ins;
DROP POLICY IF EXISTS "Check-ins readable by owner or event staff" ON check_ins;
CREATE POLICY "Check-ins readable by owner or event staff"
  ON check_ins FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM passes p
      WHERE p.id = pass_id AND (p.user_id = auth.uid() OR staff_can_access_event(p.event_id))
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Atomic Squad Join Function & Capacity Enforcement (ISSUE 3)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_squad_atomic(
  p_share_code TEXT,
  p_user_id UUID
)
RETURNS SETOF passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_squad squads;
  v_tier ticket_tiers;
  v_existing_pass passes;
  v_pass passes;
  v_max INT;
  v_count INT;
BEGIN
  -- 1. Lock squad row FOR UPDATE
  SELECT * INTO v_squad
  FROM squads
  WHERE share_code = upper(p_share_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  -- 2. Fetch ticket tier details
  SELECT * INTO v_tier
  FROM ticket_tiers
  WHERE id = v_squad.tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket tier not found';
  END IF;

  -- 3. Check paid tier order status if tier.price > 0
  IF v_tier.price > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM payment_orders
      WHERE user_id = v_squad.creator_id
        AND tier_id = v_squad.tier_id
        AND status = 'paid'
    ) THEN
      RAISE EXCEPTION 'Cannot join squad: Creator order is not paid';
    END IF;
  END IF;

  -- 4. Check if user already has a pass in this squad
  SELECT * INTO v_existing_pass
  FROM passes
  WHERE squad_id = v_squad.id AND user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    RETURN NEXT v_existing_pass;
    RETURN;
  END IF;

  -- 5. Enforce max_members
  v_max := COALESCE(v_squad.max_members, 4);
  v_count := COALESCE(cardinality(v_squad.member_pass_ids), 0);

  IF v_count >= v_max THEN
    RAISE EXCEPTION 'Squad is full';
  END IF;

  -- 6. Atomic pass issuance
  FOR v_pass IN
    SELECT * FROM issue_pass_atomic(
      v_squad.event_id,
      p_user_id,
      v_squad.tier_id,
      v_squad.id,
      NULL
    )
  LOOP
    UPDATE squads
    SET member_pass_ids = array_append(member_pass_ids, v_pass.id)
    WHERE id = v_squad.id;

    RETURN NEXT v_pass;
  END LOOP;

  RETURN;
END;
$$;

REVOKE EXECUTE ON FUNCTION join_squad_atomic(TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION join_squad_atomic(TEXT, UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- 4. Update finalize_paid_order to remove gen_random_bytes dependency (ISSUE 4)
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
    -- Built-in UUID substring replacement without pgcrypto dependency
    v_share_code := upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

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
