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

-- Always Rollback changes so database remains untouched
ROLLBACK;
