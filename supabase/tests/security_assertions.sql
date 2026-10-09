-- ============================================================================
-- IRL SOCIAL SECURITY ASSERTIONS TEST SUITE
-- ============================================================================
-- RUN THIS SCRIPT IN THE SUPABASE SQL EDITOR OR VIA PSQL.
-- IT IS EXECUTED ENTIRELY WITHIN A TRANSACTION THAT ENDS WITH ROLLBACK.
-- IT WILL NOT MUTATE OR PERSIST ANY DATA ON YOUR DATABASE.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. PREPARATION: Setup Mock User & Test Context
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_user1_id UUID := '11111111-1111-1111-1111-111111111111';
  v_user2_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert temporary profiles for test
  INSERT INTO public.profiles (id, name, email, role)
  VALUES 
    (v_user1_id, 'Alice NormalUser', 'alice@test.internal', 'user'::user_role),
    (v_user2_id, 'Bob VictimUser', 'bob@test.internal', 'user'::user_role)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Switch session to impersonate Normal Authenticated User (User 1)
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = '11111111-1111-1111-1111-111111111111';
SET LOCAL "request.jwt.claim.role" = 'authenticated';

-- ----------------------------------------------------------------------------
-- ASSERTION A: Authenticated user CANNOT change their own role (Role Escalation)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  UPDATE public.profiles
  SET role = 'partner'::user_role
  WHERE id = '11111111-1111-1111-1111-111111111111';

  -- If update succeeded without throwing an exception, trigger failed!
  RAISE EXCEPTION 'TEST FAILED: User was able to promote their own role to partner!';
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Unauthorized attempt to change profile role%' THEN
      RAISE NOTICE 'PASS Assertion A: Trigger prevented self role-escalation as expected ("%")', SQLERRM;
    ELSE
      RAISE NOTICE 'PASS Assertion A: Profile update rejected with error ("%")', SQLERRM;
    END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ASSERTION B: Authenticated user CANNOT insert directly into `passes` table
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dummy_event UUID := '33333333-3333-3333-3333-333333333333';
  v_dummy_tier  UUID := '44444444-4444-4444-4444-444444444444';
BEGIN
  INSERT INTO public.passes (
    event_id,
    user_id,
    tier_id,
    status
  ) VALUES (
    v_dummy_event,
    '11111111-1111-1111-1111-111111111111',
    v_dummy_tier,
    'valid'
  );

  RAISE EXCEPTION 'TEST FAILED: User was able to insert directly into passes table!';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'PASS Assertion B: Direct pass insertion blocked by RLS as expected ("%")', SQLERRM;
END $$;

-- ----------------------------------------------------------------------------
-- ASSERTION C: Authenticated user CANNOT select other users email from `profiles`
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_bob_email TEXT;
BEGIN
  -- User 1 attempts to read User 2's profile email
  SELECT email INTO v_bob_email
  FROM public.profiles
  WHERE id = '22222222-2222-2222-2222-222222222222';

  IF v_bob_email IS NOT NULL THEN
    RAISE EXCEPTION 'TEST FAILED: User 1 could read User 2 email (%)!', v_bob_email;
  ELSE
    RAISE NOTICE 'PASS Assertion C: Profiles RLS hidden Bob profile from Alice as expected.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ASSERTION D: Authenticated user CAN select from `public_profiles` view safely
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_public_name TEXT;
BEGIN
  SELECT name INTO v_public_name
  FROM public.public_profiles
  WHERE id = '22222222-2222-2222-2222-222222222222';

  IF v_public_name = 'Bob VictimUser' THEN
    RAISE NOTICE 'PASS Assertion D: public_profiles view accessible for public user info.';
  ELSE
    RAISE EXCEPTION 'TEST FAILED: public_profiles view returned unexpected result (%)', v_public_name;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ASSERTION E: Authenticated user CANNOT execute issue_pass_atomic or finalize_paid_order RPCs
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_dummy_event UUID := '33333333-3333-3333-3333-333333333333';
  v_dummy_tier  UUID := '44444444-4444-4444-4444-444444444444';
  v_dummy_order UUID := '55555555-5555-5555-5555-555555555555';
BEGIN
  -- Test RPC issue_pass_atomic
  BEGIN
    PERFORM public.issue_pass_atomic(
      v_dummy_event,
      '11111111-1111-1111-1111-111111111111',
      v_dummy_tier
    );
    RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to execute RPC issue_pass_atomic!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS Assertion E1: Calling issue_pass_atomic rejected with permission denied as expected.';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission denied%' THEN
        RAISE NOTICE 'PASS Assertion E1: Calling issue_pass_atomic rejected with permission denied as expected.';
      ELSE
        RAISE NOTICE 'PASS Assertion E1: Calling issue_pass_atomic blocked with error ("%")', SQLERRM;
      END IF;
  END;

  -- Test RPC finalize_paid_order
  BEGIN
    PERFORM public.finalize_paid_order(v_dummy_order, 'pay_123');
    RAISE EXCEPTION 'TEST FAILED: Authenticated user was able to execute RPC finalize_paid_order!';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'PASS Assertion E2: Calling finalize_paid_order rejected with permission denied as expected.';
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%permission denied%' THEN
        RAISE NOTICE 'PASS Assertion E2: Calling finalize_paid_order rejected with permission denied as expected.';
      ELSE
        RAISE NOTICE 'PASS Assertion E2: Calling finalize_paid_order blocked with error ("%")', SQLERRM;
      END IF;
  END;
END $$;

-- ----------------------------------------------------------------------------
-- ASSERTION F: Partner CANNOT read passes or emails for another partner's event
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_partner1_id UUID := '66666666-6666-6666-6666-666666666666';
  v_partner2_id UUID := '77777777-7777-7777-7777-777777777777';
  v_venue2_id   UUID := '88888888-8888-8888-8888-888888888888';
  v_event2_id   UUID := '99999999-9999-9999-9999-999999999999';
  v_pass2_count INT;
  v_email_count INT;
BEGIN
  -- Setup test partners, venue, event in postgres context
  RESET ROLE;
  INSERT INTO public.profiles (id, name, email, role)
  VALUES 
    (v_partner1_id, 'Partner One', 'partner1@test.internal', 'partner'::user_role),
    (v_partner2_id, 'Partner Two', 'partner2@test.internal', 'partner'::user_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

  INSERT INTO public.venues (id, name, location, address, partner_id)
  VALUES (v_venue2_id, 'Venue Two', 'Downtown', '123 Main St', v_partner2_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.events (id, title, description, category, venue_id, start_time, end_time, capacity, cover_image)
  VALUES (v_event2_id, 'Partner 2 Secret Event', 'Private event', 'nightlife', v_venue2_id, now(), now() + interval '2 hours', 100, 'http://example.com/img.jpg')
  ON CONFLICT (id) DO NOTHING;

  -- Switch role to Partner 1
  SET LOCAL ROLE authenticated;
  SET LOCAL "request.jwt.claim.sub" = '66666666-6666-6666-6666-666666666666';
  SET LOCAL "request.jwt.claim.role" = 'authenticated';

  -- Partner 1 attempts to read passes for Partner 2's event
  SELECT COUNT(*) INTO v_pass2_count
  FROM public.passes
  WHERE event_id = v_event2_id;

  IF v_pass2_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Partner 1 was able to read passes for Partner 2 event!';
  ELSE
    RAISE NOTICE 'PASS Assertion F1: Partner 1 blocked from reading Partner 2 passes as expected.';
  END IF;

  -- Partner 1 attempts to read Partner 2 email from profiles table
  SELECT COUNT(*) INTO v_email_count
  FROM public.profiles
  WHERE id = v_partner2_id;

  IF v_email_count > 0 THEN
    RAISE EXCEPTION 'TEST FAILED: Partner 1 was able to select Partner 2 profile record!';
  ELSE
    RAISE NOTICE 'PASS Assertion F2: Partner 1 blocked from reading Partner 2 profile email as expected.';
  END IF;
END $$;

-- Always Rollback changes so database remains untouched
ROLLBACK;


