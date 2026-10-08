# IRL Social — Security Hardening Verification Report

**Date:** October 9, 2026  
**Target Branch:** `security-hardening`  
**Base Branch:** `main`  
**Environment:** Local Working Tree & Unit Test Suite  

---

## 1. Automated Checks Summary

| Check | Command | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Linting** | `npm run lint` | **PASS** | 0 errors. Only minor LCP image element warnings on static assets. |
| **Type Checking** | `npx tsc --noEmit` | **PASS** | 0 TypeScript compilation errors. |
| **Unit Testing** | `npm test` | **PASS** | **18 tests passed** across 2 test files (`payment-helpers.test.ts`, `security-rules.test.ts`). |
| **Production Build** | `npm run build` | **PASS** | 22 static and dynamic app routes compiled cleanly. |

---

## 2. Static Security Assertions

| Security Assertion | Verification Method / Command | Status | File Paths & Details |
| :--- | :--- | :--- | :--- |
| **a. `is_simulated` Body Override** | `grep -rn "is_simulated" src/app/api/payments/` | **PASS** | `is_simulated` is determined strictly on the server based on `PAYMENTS_MODE` env var. It is **never** destructured or accepted from client HTTP request bodies in `verify` or `create-order`. |
| **b. Hardcoded Secrets Cleanup** | `grep -rn "rzp_test_irl_app" src/` | **PASS** | 0 hardcoded Razorpay keys or secret fallback strings remain in `src/`. |
| **c. Timing-Safe HMAC Comparisons** | `grep -rn "timingSafeEqual" src/` | **PASS** | `src/lib/payments.ts` lines 69 & 100 use `crypto.timingSafeEqual` for both payment signatures and webhook signatures. |
| **d. Webhook Header & Fail-Closed** | Code inspection `src/app/api/webhooks/razorpay/route.ts` | **PASS** | Lines 13-19 reject missing `x-razorpay-signature` headers (400). Lines 21-29 fail closed in production if `RAZORPAY_WEBHOOK_SECRET` is missing/unconfigured (500). |
| **e. Service Role Key Isolation** | `grep -rn "SUPABASE_SERVICE_ROLE_KEY" src/` | **PASS** | References exist **only** in server-only `src/lib/supabase/server.ts`. Never prefixed with `NEXT_PUBLIC_`, never exposed to client. |
| **f. Schema & RLS Lockdown** | Schema & Migration Audit | **PASS** | In `schema.sql` & `20261009040000_security_hardening.sql`:<br>• Client `INSERT` & `UPDATE` policies on `passes` deleted.<br>• `prevent_profile_role_escalation()` BEFORE UPDATE trigger blocks self role-promotion on `profiles`.<br>• `profiles` SELECT RLS restricted to own ID or scanner staff.<br>• `public_profiles` view created for public data.<br>• `issue_pass_atomic` uses `FOR UPDATE` row locking. |
| **g. Idempotent Migrations** | Migration Audit | **PASS** | All DDL statements use `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`, `IF NOT EXISTS`, and `DROP TRIGGER IF EXISTS`. Safe to execute multiple times on live databases. |
| **h. Sensitive Log Scan** | `grep -rn "console.log" src/` | **PASS** | No `console.log` of tokens, secrets, QR hashes, or request bodies in `src/`. Only non-sensitive UI map marker coords in partner map picker. |
| **i. Payment Orders Uniqueness** | Schema Audit | **PASS** | `payment_orders` table enforces `UNIQUE` constraints on both `razorpay_order_id` and `razorpay_payment_id`. |

---

## 3. Behavioral & Integration Verification

| Test Scenario | Verification Method | Status | Notes |
| :--- | :--- | :--- | :--- |
| **Malicious `is_simulated: true` POST** | Local HTTP curl / Unit Test | **NOT VERIFIED (no test DB)** | Covered by Vitest suite (`security-rules.test.ts`). In production, simulation mode is hard-disabled regardless of flags. |
| **Replay Attack (Duplicate Verify)** | Local HTTP curl / Unit Test | **NOT VERIFIED (no test DB)** | Covered by Vitest suite. `verify` route checks `payment_orders.status === 'paid'` and returns existing passes idempotently without double-issuing passes. |
| **Client-Supplied Amount Tampering** | Local HTTP curl / Unit Test | **NOT VERIFIED (no test DB)** | Covered by Vitest suite (`payment-helpers.test.ts`). Server calculates `price * quantity * 100` from database tier price. |
| **Scanner Rate Limiting (429)** | In-Memory Rate Limiter Test | **NOT VERIFIED (no test DB)** | IP-based rate limiter (60 req/min window) enforced in `/api/passes/validate`. |
| **SQL RLS Assertion Script** | `supabase/tests/security_assertions.sql` | **READY FOR USER EXECUTION** | Self-contained transaction script ending with `ROLLBACK`. Proves normal authenticated user cannot change role, insert passes, or read emails. |

---

## 4. Pre-Push Hygiene Audit

1. **Gitignore Verification**: `.env.local` is present in `.gitignore` and **not** tracked or staged in git.
2. **Secrets Scan**: Staged diff scanned for patterns (`rzp_live_`, `rzp_test_`, service_role JWTs `eyJ...`, private keys). **0 secrets found**.
3. **Stray Assets**: Removed unused stray root image files (`ChatGPT Image ...`).
4. **Lockfile Consistency**: `npm ci --dry-run` executed successfully with code 0.

---

## 5. File Changes List (`git diff --stat`)

```text
 .env.local.example                              |  34 +++++--
 README.md                                       |  57 +++++++++--
 SECURITY_FIXES.md                               |  35 +++++++
 VERIFICATION_REPORT.md                          | 115 ++++++++++++++++++++++
 package-lock.json                               | 150 ++++++++++++++--------------
 package.json                                    |   7 +-
 src/__tests__/payment-helpers.test.ts           | 147 +++++++++++++++++++++++++++
 src/__tests__/security-rules.test.ts            |  81 +++++++++++++++
 src/app/api/passes/validate/route.ts            |  65 ++++++++----
 src/app/api/payments/claim-free/route.ts        |  75 ++++++++++++++
 src/app/api/payments/create-order/route.ts      |  92 +++++++++--------
 src/app/api/payments/verify/route.ts            |  97 ++++++++++--------
 src/app/api/venues/search/route.ts             |  23 +++--
 src/app/api/webhooks/razorpay/route.ts          |  56 ++++++----
 src/app/partner/events/new/page.tsx            |   9 +-
 src/components/events/checkout-modal.tsx        |  24 +++--
 src/components/events/event-detail.tsx          |  13 ++-
 src/components/events/open-squad-modal.tsx      |  11 +-
 src/components/partner/venue-map-picker.tsx    |  12 ++-
 src/lib/actions/auth.ts                        |  19 +++-
 src/lib/actions/events.ts                      |   9 +-
 src/lib/actions/scanner.ts                     |  41 +++++---
 src/lib/actions/tickets.ts                     |  45 ++++++---
 src/lib/payments.ts                             | 102 +++++++++++++++++++
 src/lib/supabase/server.ts                      |  15 ++-
 src/types/supabase.ts                           |  48 ++++++++-
 supabase/migrations/20261009040000_security_hardening.sql | 201 ++++++++++++++++++++++++++++++++++++++
 supabase/schema.sql                             | 112 ++++++++++++++-------
 supabase/tests/security_assertions.sql          | 135 +++++++++++++++++++++++++
 vitest.config.mjs                               |  12 +++
 30 files changed, 1432 insertions(+), 210 deletions(-)
```

---

## 6. Known Limitations & Unverified Items

- **Local Live Database HTTP Endpoints (`curl` against localhost:3000)**: Marked as **`NOT VERIFIED (no test database)`** because no local Supabase instance was running on localhost, and connecting or firing test requests against the production database (`irlsocial.in` / prod Supabase) was strictly prohibited by the hardening rules.
- **Equivalent Logic Coverage**: All critical behavioral logic (HMAC verification, amount calculation, simulation overrides, idempotency state transitions, and view field exclusions) has been thoroughly covered by unit tests in `src/__tests__/`.

---

## 7. Mandatory Deployment Sequence for Project Owner

Follow this **exact order** when deploying to production:

1. **Step 1: Execute SQL Migration on Supabase**
   - Open your [Supabase Dashboard](https://supabase.com/dashboard).
   - Go to the **SQL Editor**.
   - Copy and run `supabase/migrations/20261009040000_security_hardening.sql`.
   - *(Optional sanity check)*: Run `supabase/tests/security_assertions.sql` in the SQL editor to verify RLS policies block role updates and direct pass insertions.

2. **Step 2: Configure Environment Variables in Vercel**
   - Go to **Vercel Project Settings -> Environment Variables**.
   - Ensure the following variables are set for Production:
     - `SUPABASE_SERVICE_ROLE_KEY` = `<your-supabase-service-role-secret>`
     - `PAYMENTS_MODE` = `live`
     - `RAZORPAY_KEY_ID` = `<your-live-razorpay-key-id>`
     - `RAZORPAY_KEY_SECRET` = `<your-live-razorpay-key-secret>`
     - `RAZORPAY_WEBHOOK_SECRET` = `<your-live-razorpay-webhook-secret>`

3. **Step 3: Merge GitHub Pull Request**
   - Review and merge the pull request from branch `security-hardening` into `main`.

4. **Step 4: Post-Deployment Verification**
   - Re-run the manual security checklist against `irlsocial.in` (e.g. attempting to POST `is_simulated: true` to verify API returns 400 or fails verification, verifying pass scanning works at venue, etc.).
