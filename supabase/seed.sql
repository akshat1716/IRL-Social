-- IRL Social & Event Platform — Supabase Seed Data
-- Run this in the Supabase SQL Editor or via CLI (`supabase db seed`)

-- 1. Create Demo Partner User in auth.users if not exists
INSERT INTO auth.users (
  id, instance_id, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud
)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  '00000000-0000-0000-0000-000000000000',
  'host@irl.social',
  '$2a$10$e8.Z/YqC6kO/X2F1x8XQ/e.6X6W1bQ8jX7W7.Z.X8.X8.X8.X8.X8',
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"IRL Event Host"}',
  now(),
  now(),
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

-- Ensure Profile exists with partner role
INSERT INTO profiles (id, name, email, phone, role)
VALUES (
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  'IRL Host',
  'host@irl.social',
  '+91 98765 43210',
  'partner'
) ON CONFLICT (id) DO UPDATE SET role = 'partner';

-- 2. Create Venues
INSERT INTO venues (id, name, location, address, partner_id, lat, lng) VALUES
  ('11111111-1111-1111-1111-111111111101', 'Sunrise Park Hub', 'Cubbon Park', 'Kasturba Rd, Sampangi Rama Nagar, Bangalore', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12.9763, 77.5929),
  ('11111111-1111-1111-1111-111111111102', 'Neon Pulse Club', 'Indiranagar', '100 Feet Rd, Indiranagar, Bangalore', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12.9784, 77.6408),
  ('11111111-1111-1111-1111-111111111103', 'The Velvet Lounge & Vinyl Bar', 'Koramangala', '5th Block, Koramangala, Bangalore', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12.9352, 77.6245),
  ('11111111-1111-1111-1111-111111111104', 'Brew & Board Corner', 'HSR Layout', '27th Main Rd, HSR Layout, Bangalore', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 12.9116, 77.6473)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  location = EXCLUDED.location,
  address = EXCLUDED.address,
  lat = EXCLUDED.lat,
  lng = EXCLUDED.lng;

-- 3. Create Sample Events (Daytime Run Clubs & Nightlife Indie Mixers)
INSERT INTO events (
  id, venue_id, title, description, category, cover_image, start_time, end_time, capacity, current_attendees, vibe_status, is_daytime
) VALUES
  (
    '22222222-2222-2222-2222-222222222201',
    '11111111-1111-1111-1111-111111111101',
    'Sunrise 5K Run & Coffee Social',
    'Kick off your weekend morning with a guided 5K loop through Cubbon Park, followed by artisan cold brews and networking with local runners.',
    'run_club',
    'park',
    now() + interval '1 day' + interval '6 hours',
    now() + interval '1 day' + interval '9 hours',
    100,
    38,
    'warming_up',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222202',
    '11111111-1111-1111-1111-111111111103',
    'Indie Rock & Vinyl Mixer',
    'An exclusive evening of curated indie vinyl records, house cocktails, and social icebreakers for indie music lovers and creatives.',
    'mixer',
    'club',
    now() + interval '2 days' + interval '19 hours',
    now() + interval '2 days' + interval '23 hours',
    80,
    62,
    'peak_vibe',
    false
  ),
  (
    '22222222-2222-2222-2222-222222222203',
    '11111111-1111-1111-1111-111111111102',
    'Neon Midnight Groove',
    'High energy nightlife experience featuring synth-wave DJs, immersive light projections, and squad pass drink perks.',
    'nightlife',
    'club',
    now() + interval '3 days' + interval '21 hours',
    now() + interval '4 days' + interval '3 hours',
    150,
    142,
    'peak_vibe',
    false
  ),
  (
    '22222222-2222-2222-2222-222222222204',
    '11111111-1111-1111-1111-111111111104',
    'Sunday Board Games & Brews',
    'Relaxed afternoon of strategy board games, espresso, craft brews, and casual squad matchmaking.',
    'board_games',
    'cafe',
    now() + interval '4 days' + interval '11 hours',
    now() + interval '4 days' + interval '16 hours',
    60,
    20,
    'chill',
    true
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  cover_image = EXCLUDED.cover_image,
  start_time = EXCLUDED.start_time,
  end_time = EXCLUDED.end_time,
  capacity = EXCLUDED.capacity,
  current_attendees = EXCLUDED.current_attendees,
  vibe_status = EXCLUDED.vibe_status,
  is_daytime = EXCLUDED.is_daytime;

-- 4. Create Ticket Tiers
INSERT INTO ticket_tiers (
  id, event_id, name, description, price, cover_redeemable_amount, max_quantity, sold_count
) VALUES
  -- Tiers for Sunrise 5K Run & Coffee Social
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Early Bird Runner Pass', 'Includes entry, timing bib & cold brew', 199, 100, 50, 38),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Standard Stride Pass', 'Standard entry + post-run coffee & snack', 299, 150, 50, 0),

  -- Tiers for Indie Rock & Vinyl Mixer
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222202', 'Indie Mixer Pass', 'Includes venue entry + 1 signature vinyl cocktail', 499, 250, 50, 42),
  ('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222202', 'VIP Vinyl Lounge Pass', 'Priority seating, 2 cocktails + exclusive vinyl compilation', 899, 400, 30, 20),

  -- Tiers for Neon Midnight Groove
  ('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222203', 'General Admission', 'Full club access + cover credit', 699, 350, 100, 92),
  ('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222203', 'Squad VIP Table Pass', 'Fast-track entry for squad + table cover credit', 1299, 750, 50, 50),

  -- Tiers for Sunday Board Games & Brews
  ('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222204', 'Gamer Free RSVP', 'Free entry with unlimited board game access', 0, 0, 40, 20),
  ('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222204', 'Brew & Game Bundle', 'Entry + unlimited games + 1 craft brew', 249, 150, 20, 0)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  cover_redeemable_amount = EXCLUDED.cover_redeemable_amount,
  max_quantity = EXCLUDED.max_quantity,
  sold_count = EXCLUDED.sold_count;
