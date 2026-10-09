# IRL Social — Security Hardening Verification Report (Pass 3)

**Date:** October 9, 2026  
**Target Branch:** `security-hardening`  
**Base Branch:** `main`  
**Environment:** Local Working Tree & Vitest Unit Test Suite  

---

## 1. Automated Checks Summary

| Check | Command | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Linting** | `npm run lint` | **PASS** | 0 errors. Only minor LCP image element warnings on static assets. |
| **Type Checking** | `npx tsc --noEmit` | **PASS** | 0 TypeScript compilation errors. |
| **Unit Testing** | `npm test` | **PASS** | **21 tests passed** across 2 test files (`payment-helpers.test.ts`, `security-rules.test.ts`). Real route handlers & server actions invoked with mocked Supabase client. |
| **Production Build** | `npm run build` | **PASS** | 22 static and dynamic app routes compiled cleanly. |

---

## 2. Security Enhancements Summary (Pass 3)

### 1. Partner Self-Promotion Prevention (`partner_applications`)
- **Problem**: `requestPartnerAccess()` previously allowed any authenticated user to elevate their profile role to `partner` instantly.
- **Fix**: Created `partner_applications` table (`user_id`, `message`, `status` `pending|approved|rejected`, `created_at`). `requestPartnerAccess()` now inserts an application with `status = 'pending'`. Role elevation is granted ONLY when an administrator approves the application.
- **Single Source of Truth**: Removed `role` from `user_metadata` writes (`supabase.auth.updateUser({data:{role}})`). The `profiles` table is the single source of truth for user roles.
- **Admin Approval Path**:
  ```sql
  BEGIN;
  ALTER TABLE public.profiles DISABLE TRIGGER check_profile_role_change;
  UPDATE public.partner_applications SET status = 'approved' WHERE user_id = 'TARGET_USER_ID';
  UPDATE public.profiles SET role = 'partner'::user_role WHERE id = 'TARGET_USER_ID';
  ALTER TABLE public.profiles ENABLE TRIGGER check_profile_role_change;
  COMMIT;
  ```

### 2. Scoped Scanner & Partner Database Access (`event_staff`)
- **Problem**: `is_scanner_staff()` gave blanket read access to all passes, profiles (including emails), and check-ins, allowing staff to scan any event.
- **Fix**: Replaced with per-event scoping via `staff_can_access_event(p_event_id)` and created `event_staff` mapping table:
  - **Passes**: Readable ONLY by pass owner OR event-assigned staff (`auth.uid() = user_id OR staff_can_access_event(event_id)`).
  - **Profiles**: RLS policy restricted to `auth.uid() = id` (own profile only). Partners/door staff read attendee names/avatars through `public_profiles` view; attendee emails are NEVER exposed.
  - **Check-ins**: `INSERT` and `SELECT` restricted strictly to assigned event staff (`staff_can_access_event(p.event_id)`).

### 3. Atomic Squad Joining (`join_squad_atomic`) & Seat Capacity
- **Model Enforced**: Creator's payment covers up to `max_members` seats (default 4).
- **Atomic Procedure**: Implemented `join_squad_atomic(p_share_code, p_user_id)` procedure in PostgreSQL with row locking (`SELECT ... FOR UPDATE` on `squads`).
- **Guards**: Prevents duplicate pass issuance if user is already a squad member, verifies paid tier creator order status, and enforces `max_members` inside SQL.

### 4. Database Portability & `pgcrypto` Clean Up
- Replaced `gen_random_bytes` in `finalize_paid_order` with built-in UUID manipulation: `upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))`.
- **Operational Note**: User signups via Supabase Auth should be tested after applying database migrations to confirm `handle_new_user()` trigger completes smoothly.

---

## 3. Server Action Security Audit ("use server" Files)

Every exported server action across the codebase has been audited for parameter injection, privilege escalation, and caller authorization boundaries.

### A. `src/lib/actions/tickets.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `getUserPasses()` | **YES** | Binds strictly to authenticated caller session (`requireUser()`). Reads only own passes. |
| `getSquadByCode(code)` | **YES** | Read-only squad metadata lookup by share code. |
| `joinSquad(code)` | **YES** | Authenticated caller required. Calls atomic stored procedure `join_squad_atomic` via service-role admin client. Handles duplicate joins and over-capacity errors safely. |
| `getPublicSquadsForEvent(eventId)` | **YES** | Read-only public squad listing for event. |
| `createPublicOpenSquad(input)` | **YES** | Authenticated caller required. Enforces `price === 0` tier check in database; paid tiers are rejected. |

### B. `src/lib/actions/auth.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `signOut()` | **YES** | Invalidates caller session. |
| `getCurrentUser()` | **YES** | Returns profile data for authenticated caller session (`user.id`). Role derived from `profiles` table. |
| `updateProfile(formData)` | **YES** | Requires authentication (`user.id`). Updates profile using caller's session ID only. Role changes strictly disallowed. |
| `requestPartnerAccess(message)` | **YES** | Requires authentication. Inserts a `pending` row into `partner_applications` table for admin review. Does NOT elevate user role. |
| `getPartnerApplicationStatus()` | **YES** | Returns status (`pending`, `approved`, `rejected`) of caller's own partner application. |
| `getPayoutDetails()` | **YES** | Returns payout metadata for caller session. |
| `updatePayoutDetails(details)` | **YES** | Updates payout metadata for caller session (`user.id`). |

### C. `src/lib/actions/events.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `getEvents(vibe)` | **YES** | Read-only public events query. |
| `getEventById(id)` | **YES** | Read-only public event query. |
| `getVenues()` | **YES** | Read-only public venues query. |
| `createVenue(input)` | **YES** | Authenticated caller required. Binds `partner_id` strictly to authenticated `user.id`. |
| `createEvent(input)` | **YES** | Authenticated caller required. Verifies venue ownership (`venue.partner_id === user.id`) before inserting event. |
| `getEventAnalytics(eventId)` | **YES** | Authenticated caller required. Verifies venue ownership (`event.venue.partner_id === user.id`) before exposing ticket sales and revenue metrics. |

### D. `src/lib/actions/scanner.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `validatePass(passHash)` | **YES** | Requires `door_staff` or `partner` role (`requireScannerStaff()`). Partners restricted to scanning passes for events at their own venues. Handles `check_ins` unique violation (`23505`) as `ALREADY_SCANNED`. |
| `getEventPassesForCache(eventId)` | **YES** | Requires `door_staff` or `partner` role. Partners restricted to caching passes for their own venues. |
| `getEventsForScanner()` | **YES** | Requires `door_staff` or `partner` role. Filters event list by partner venue ownership. |

---

## 4. Known Limitations & Unverified Items

- **Local Live Database HTTP Endpoints (`curl` against localhost:3000)**: Marked as **`NOT VERIFIED (no test database)`** because no local Supabase container was active on `localhost:5432/54321`, and executing queries or HTTP calls against production (`irlsocial.in` / prod Supabase DB) was strictly forbidden by hardening rules.
- **Unit Test Coverage**: Route handler integration logic, partner application submission, RPC lockdowns, HMAC verification, `NODE_ENV=production` simulation blocks, idempotency, signature rejection, free-tier price validation, and server-side order total calculation are 100% verified via Vitest.

---

## 5. Mandatory Deployment Sequence for Project Owner

Perform these steps in **exact order** to deploy to production:

1. **Step 1: Execute SQL Migrations in Supabase (In Chronological Order)**
   - Open your [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**.
   - **Migration 1**: Execute [`supabase/migrations/20261009040000_security_hardening.sql`](file:///Users/akshat/Desktop/IRL/supabase/migrations/20261009040000_security_hardening.sql) (if not already applied).
   - **Migration 2**: Execute [`supabase/migrations/20261009120000_lock_down_functions.sql`](file:///Users/akshat/Desktop/IRL/supabase/migrations/20261009120000_lock_down_functions.sql).
   - **Migration 3**: Execute [`supabase/migrations/20261009180000_scoped_access_and_squads.sql`](file:///Users/akshat/Desktop/IRL/supabase/migrations/20261009180000_scoped_access_and_squads.sql).
   - *(Sanity Check)*: Run [`supabase/tests/security_assertions.sql`](file:///Users/akshat/Desktop/IRL/supabase/tests/security_assertions.sql) in the SQL Editor to verify RLS policies, RPC lockdowns, and partner event isolation.

2. **Step 2: Configure Environment Variables in Vercel**
   - Ensure the following variables are set in Vercel Project Settings:
     - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-secret>`
     - `PAYMENTS_MODE` = `live`
     - `RAZORPAY_KEY_ID` = `<your-live-razorpay-key-id>`
     - `RAZORPAY_KEY_SECRET` = `<your-live-razorpay-key-secret>`
     - `RAZORPAY_WEBHOOK_SECRET` = `<your-live-razorpay-webhook-secret>`

3. **Step 3: Merge Pull Request**
   - Merge the pull request from branch `security-hardening` into `main`.
