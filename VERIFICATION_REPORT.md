# IRL Social — Security Hardening Verification Report (Pass 2)

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
| **Unit Testing** | `npm test` | **PASS** | **19 tests passed** across 2 test files (`payment-helpers.test.ts`, `security-rules.test.ts`). Real route handlers invoked with mocked Supabase client. |
| **Production Build** | `npm run build` | **PASS** | 22 static and dynamic app routes compiled cleanly. |

---

## 2. Server Action Security Audit ("use server" Files)

Every exported server action across the codebase has been audited for parameter injection, privilege escalation, and caller authorization boundaries.

### A. `src/lib/actions/tickets.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `getUserPasses()` | **YES** | Binds strictly to authenticated caller session (`requireUser()`). Reads only own passes. |
| `getSquadByCode(code)` | **YES** | Read-only squad metadata lookup by share code. |
| `joinSquad(code)` | **YES** | Authenticated caller required. Enforces squad capacity. Checks database: if ticket tier `price > 0`, verifies creator order status is `'paid'` before issuing squad pass. |
| `getPublicSquadsForEvent(eventId)` | **YES** | Read-only public squad listing for event. |
| `createPublicOpenSquad(input)` | **YES** | Authenticated caller required. Enforces `price === 0` tier check in database; paid tiers are rejected (must use checkout flow). |

*Note*: Internal ticket creation helpers (`hydratePassInternal`, `issuePassInternal`, `createSquadPassCheckoutInternal`, `finalizePaidOrderInternal`) were moved to `src/lib/server/tickets-internal.ts` backed by `import "server-only"`.

### B. `src/lib/actions/auth.ts`
| Exported Server Action | Safe to Call from Browser? | Authorization & Input Validation |
| :--- | :--- | :--- |
| `signOut()` | **YES** | Invalidates caller session. |
| `getCurrentUser()` | **YES** | Returns profile data for authenticated caller session (`user.id`). |
| `updateProfile(formData)` | **YES** | Requires authentication (`user.id`). Updates profile using caller's session ID only. Role changes strictly disallowed. |
| `requestPartnerAccess()` | **YES** | Requires authentication. Updates caller's own profile role to `partner` via admin client. |
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

## 3. Database Security & Stored Procedure Lockdowns

| Security Control | Implementation Location | Verification Status | Notes |
| :--- | :--- | :--- | :--- |
| **`issue_pass_atomic` Execution Lock** | `20261009120000_lock_down_functions.sql` & `schema.sql` | **PASS (Unit / SQL Test)** | `REVOKE EXECUTE FROM PUBLIC, anon, authenticated; GRANT EXECUTE TO service_role;` |
| **Atomic `finalize_paid_order` RPC** | `20261009120000_lock_down_functions.sql` & `schema.sql` | **PASS (Unit / SQL Test)** | Locks `payment_orders` row `FOR UPDATE`, sets status `'paid'`, issues passes or returns existing passes atomically in 1 transaction. Service-role only. |
| **Helper Function Permissions** | `20261009120000_lock_down_functions.sql` | **PASS** | REVOKED EXECUTE on `staff_can_scan_event`, `handle_new_user`, and `prevent_profile_role_escalation` from `authenticated`/`anon`/`PUBLIC`. RLS helpers (`is_partner`, `is_scanner_staff`, `owns_venue`) remain available for policy evaluations. |
| **SQL Assertions Test File** | `supabase/tests/security_assertions.sql` | **PASS (SQL Script)** | Added `Assertion E`: authenticated user calling RPC `issue_pass_atomic` or `finalize_paid_order` receives `permission denied`. |

---

## 4. Endpoint Remediation Audit

1. **Free-Pass Endpoints Removal**:
   - `POST /api/passes`: Removed. Endpoint now exports ONLY `GET`.
   - `POST /api/squad`: Removed. Endpoint now exports ONLY `GET`.
   - Tested in `security-rules.test.ts`: `(passesRoute as any).POST` and `(squadRoute as any).POST` are `undefined`.
2. **Server-Only Boundary (`server-only`)**:
   - Installed `server-only` package.
   - Created `src/lib/server/tickets-internal.ts` starting with `import "server-only"`.
   - Functions `hydratePassInternal`, `issuePassInternal`, `createSquadPassCheckoutInternal`, and `finalizePaidOrderInternal` isolated from client bundles.

---

## 5. Known Limitations & Unverified Items

- **Local Live Database HTTP Endpoints (`curl` against localhost:3000)**: Marked as **`NOT VERIFIED (no test database)`** because no local Supabase container was active on `localhost:5432/54321`, and executing queries or HTTP calls against production (`irlsocial.in` / prod Supabase DB) was strictly forbidden by hardening rules.
- **Unit Test Coverage**: Route handler integration logic, HMAC verification, `NODE_ENV=production` simulation blocks, idempotency, signature rejection, free-tier price validation, and server-side order total calculation are 100% verified via Vitest.

---

## 6. Mandatory Deployment Steps for Project Owner

Perform these steps in exact order to deploy to production:

1. **Step 1: Execute SQL Migrations in Supabase**
   - Open your [Supabase Dashboard](https://supabase.com/dashboard) -> **SQL Editor**.
   - Execute [`supabase/migrations/20261009040000_security_hardening.sql`](file:///Users/akshat/Desktop/IRL/supabase/migrations/20261009040000_security_hardening.sql) (if not already applied).
   - Execute [`supabase/migrations/20261009120000_lock_down_functions.sql`](file:///Users/akshat/Desktop/IRL/supabase/migrations/20261009120000_lock_down_functions.sql).
   - *(Optional Sanity Check)*: Run [`supabase/tests/security_assertions.sql`](file:///Users/akshat/Desktop/IRL/supabase/tests/security_assertions.sql) in the SQL Editor to verify RLS and RPC execution lock downs block unauthorized users.

2. **Step 2: Configure Environment Variables in Vercel**
   - Ensure the following variables are set in Vercel Project Settings:
     - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-secret>`
     - `PAYMENTS_MODE` = `live`
     - `RAZORPAY_KEY_ID` = `<your-live-razorpay-key-id>`
     - `RAZORPAY_KEY_SECRET` = `<your-live-razorpay-key-secret>`
     - `RAZORPAY_WEBHOOK_SECRET` = `<your-live-razorpay-webhook-secret>`

3. **Step 3: Merge Pull Request**
   - Merge the pull request from branch `security-hardening` into `main`.
