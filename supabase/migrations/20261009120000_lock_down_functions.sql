-- IRL Social & Event Platform — Function Hardening & Order Finalization Migration
-- Migration Timestamp: 20261009120000
-- Idempotent script safe to run on live Supabase databases

-- ---------------------------------------------------------------------------
-- 1. Atomic Order Finalization Function (Race-safe & Recoverable)
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
  -- 1. Lock payment order row FOR UPDATE
  SELECT * INTO v_order
  FROM payment_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  -- 2. If order already paid, return existing passes for this order (race-safe recovery)
  IF v_order.status = 'paid' THEN
    RETURN QUERY
    SELECT * FROM passes
    WHERE order_id = p_order_id;
    RETURN;
  END IF;

  -- 3. Mark order paid with payment id
  UPDATE payment_orders
  SET status = 'paid',
      razorpay_payment_id = COALESCE(p_payment_id, razorpay_payment_id),
      updated_at = now()
  WHERE id = p_order_id;

  -- 4. Issue passes depending on squad_mode or regular quantity
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

    -- Issue creator pass
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
    -- Regular quantity purchase
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

-- ---------------------------------------------------------------------------
-- 2. Lock Down Function Execution Permissions (Service-Role Only)
-- ---------------------------------------------------------------------------

-- Lock down issue_pass_atomic
REVOKE EXECUTE ON FUNCTION issue_pass_atomic(UUID, UUID, UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION issue_pass_atomic(UUID, UUID, UUID, UUID, UUID) TO service_role;

-- Lock down finalize_paid_order
REVOKE EXECUTE ON FUNCTION finalize_paid_order(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION finalize_paid_order(UUID, TEXT) TO service_role;

-- Lock down staff_can_scan_event
REVOKE EXECUTE ON FUNCTION staff_can_scan_event(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION staff_can_scan_event(UUID, UUID) TO service_role;

-- Lock down handle_new_user
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;

-- Lock down prevent_profile_role_escalation
REVOKE EXECUTE ON FUNCTION prevent_profile_role_escalation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prevent_profile_role_escalation() TO service_role;
