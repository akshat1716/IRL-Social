# IRL Social — Security & Quality Hardening Pass Final Report

This document details the security audit findings, architectural changes, database hardening, and empirical verification results performed on **IRL Social** (`irlsocial.in`).

---

## 📋 Executive Summary of Fixes

| Issue ID | Risk Level | Target Component | Root Cause | Fix Summary | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ISSUE 1** | **CRITICAL** | Payment Processing (`create-order`, `verify`) | Client `is_simulated` flag bypassed HMAC checks; amount trusted from client; no replay protection. | Server-calculated amounts from DB, timing-safe HMAC checks, persistent `payment_orders` audit trail, server-controlled `PAYMENTS_MODE`. | **FIXED** |
| **ISSUE 2** | **CRITICAL** | Supabase RLS (`passes` table) | Anon key permitted client `INSERT` and `UPDATE` on `passes` without payment. | Removed client `INSERT` and `UPDATE` RLS policies. Pass issuance restricted to `SECURITY DEFINER` function `issue_pass_atomic`. | **FIXED** |
| **ISSUE 3** | **CRITICAL** | Authorization (`profiles.role`) | Profile `UPDATE` policy lacked column restriction, enabling self-promotion to `partner`/`door_staff`. | Added `prevent_profile_role_escalation` `BEFORE UPDATE` trigger on `profiles`. Role elevation restricted to service role. | **FIXED** |
| **ISSUE 4** | **HIGH** | PII Privacy (`profiles` table) | `profiles` SELECT policy `USING (true)` exposed user emails and phone numbers publicly. | Restricted `profiles` SELECT to profile owner or scanner staff. Created sanitized `public_profiles` view (`id`, `name`, `avatar_url`). | **FIXED** |
| **ISSUE 5** | **HIGH** | Razorpay Webhook (`webhooks/razorpay`) | Webhook skipped signature verification if header or secret was missing or placeholder. | Enforced mandatory HMAC-SHA256 signature check (`verifyWebhookSignature`), constant-time compare, fail-closed in production. | **FIXED** |
| **ISSUE 6** | **HIGH** | Race Condition (`createPass`) | Read-then-insert pattern allowed concurrent requests to oversell limited ticket tiers. | Encapsulated capacity check and insertion inside atomic `issue_pass_atomic()` procedure with `SELECT ... FOR UPDATE` row locking. | **FIXED** |
| **ISSUE 7** | **MEDIUM** | Scanner Authorization (`scanner.ts`, `/api/passes/validate`) | Partners could scan passes for any venue; validate endpoint lacked request capping. | Restricted scanner validation to events at partner's owned venue; handled `check_ins` unique constraint gracefully; added IP rate limiter. | **FIXED** |
| **ISSUE 8** | **LOW** | Housekeeping & Presentation | Template Next.js README; missing environment variable docs; mock fallbacks in production. | Replaced README, created `.env.local.example` with clear annotations, gated mock squad fallback to non-production only. | **FIXED** |
| **ISSUE 9** | **MEDIUM** | Test Automation | Zero test coverage for payment calculation, HMAC verification, and security rules. | Installed Vitest (`vitest`), added `npm test` script with 16 comprehensive unit tests passing cleanly. | **FIXED** |

---

## 🛠️ Detailed Changes & Verification

### ISSUE 1 (CRITICAL): Payment Verification Hardening
- **Files Modified**:
  - `src/lib/payments.ts`
  - `src/app/api/payments/create-order/route.ts`
  - `src/app/api/payments/verify/route.ts`
  - `src/app/api/payments/claim-free/route.ts`
  - `src/components/events/checkout-modal.tsx`
- **What Changed**:
  1. Created `isSimulationMode()` which returns `false` whenever `NODE_ENV === "production"`, ignoring any client-sent simulation flags.
  2. `create-order` computes payment amount in paise server-side (`calculateOrderAmount({ price, quantity, squad_mode })`) directly from `ticket_tiers.price`. Client-sent `amount` is ignored.
  3. Stored all created orders in a new database table `payment_orders` with status `'created'`.
  4. `verify` retrieves order details directly from `payment_orders` using the authenticated user context. It verifies signatures using `crypto.timingSafeEqual()` in constant time.
  5. Implemented idempotency: subsequent calls to `verify` for an already-paid order return the existing passes without re-issuing new ones.
  6. Added `/api/payments/claim-free` endpoint specifically for `price === 0` ticket tiers with rate-limiting and server validation.

### ISSUE 2 (CRITICAL): Direct Pass Insertion & Tampering Prevention
- **Files Modified**:
  - `supabase/migrations/20261009040000_security_hardening.sql`
  - `supabase/schema.sql`
  - `src/lib/actions/tickets.ts`
- **What Changed**:
  1. Dropped `Users can insert own passes` and `Users can update own passes` policies on `passes` table.
  2. Retained ONLY `Users can read own passes` SELECT policy.
  3. Implemented `issue_pass_atomic()` PostgreSQL `SECURITY DEFINER` function. Pass creation goes strictly through server actions or API routes utilizing service role privileges.

### ISSUE 3 (CRITICAL): Role Self-Promotion Prevention
- **Files Modified**:
  - `supabase/migrations/20261009040000_security_hardening.sql`
  - `supabase/schema.sql`
  - `src/lib/actions/auth.ts`
- **What Changed**:
  1. Added `prevent_profile_role_escalation()` `BEFORE UPDATE` trigger on `profiles` that throws an exception if `NEW.role IS DISTINCT FROM OLD.role` unless the caller is `service_role`.
  2. Updated `requestPartnerAccess()` server action in `src/lib/actions/auth.ts` to perform role elevation via `createAdminClient()`.
  3. Ensured `handle_new_user()` trigger defaults role to `'user'` without reading user-supplied metadata.

#### Operational Note: How to Manually Promote a User to Partner Role
Since the database trigger `check_profile_role_change` blocks role modifications from standard authenticated client connections, use one of the following two safe administrative methods to promote a user:

**Method A: Using Supabase Admin / Service Role Client (Recommended)**
Use the `createAdminClient()` (or Supabase Service Role Key) from a server context:
```typescript
import { createAdminClient } from "@/lib/supabase/server";

const adminClient = createAdminClient();
await adminClient
  .from("profiles")
  .update({ role: "partner" })
  .eq("id", targetUserId);
```

**Method B: SQL Editor / Transaction Override**
Inside the Supabase Dashboard SQL Editor, wrap your update in a transaction that temporarily disables the trigger:
```sql
BEGIN;
ALTER TABLE public.profiles DISABLE TRIGGER check_profile_role_change;

UPDATE public.profiles
SET role = 'partner'::user_role
WHERE id = 'TARGET_USER_UUID_HERE';

ALTER TABLE public.profiles ENABLE TRIGGER check_profile_role_change;
COMMIT;
```


### ISSUE 4: Profile Email & Phone Privacy
- **Files Modified**:
  - `supabase/migrations/20261009040000_security_hardening.sql`
  - `supabase/schema.sql`
  - `src/lib/actions/tickets.ts`
- **What Changed**:
  1. Updated `profiles` SELECT RLS policy to `auth.uid() = id OR is_scanner_staff()`.
  2. Created `public_profiles` view exposing only safe public attributes: `id`, `name`, `avatar_url`, `created_at`.
  3. Granted `SELECT` on `public_profiles` to `anon` and `authenticated` roles.

### ISSUE 5: Webhook Signature Enforcement
- **Files Modified**:
  - `src/app/api/webhooks/razorpay/route.ts`
- **What Changed**:
  1. Enforced mandatory `x-razorpay-signature` header on all incoming webhook requests.
  2. Implemented constant-time verification using `verifyWebhookSignature()`.
  3. Configured webhook route to fail closed with 500 error in production if `RAZORPAY_WEBHOOK_SECRET` is missing.
  4. Made webhook handling idempotent by checking `payment_orders` before settling payments or minting passes.

### ISSUE 6: Overselling Race Condition Prevention
- **Files Modified**:
  - `supabase/migrations/20261009040000_security_hardening.sql`
  - `src/lib/actions/tickets.ts`
- **What Changed**:
  1. Created `issue_pass_atomic()` PostgreSQL procedure which locks the target `ticket_tiers` row (`SELECT ... FOR UPDATE`), checks `sold_count < max_quantity`, inserts pass(es), and updates attendee count in a single atomic transaction.

### ISSUE 7: Scanner Authorization & Rate Limiting
- **Files Modified**:
  - `src/lib/actions/scanner.ts`
  - `src/app/api/passes/validate/route.ts`
- **What Changed**:
  1. Enforced venue ownership check: partners can only validate passes for events at venues they own (`venue.partner_id === user.id`).
  2. Added handling for PostgreSQL error `23505` (`unique_violation`) when inserting into `check_ins` to return `ALREADY_SCANNED` cleanly.
  3. Added sliding-window rate-limiter (60 validation requests per minute per IP) on `/api/passes/validate`.

---

## 🧪 Verification Matrix

| Verification Step | Command / Tool | Result |
| :--- | :--- | :--- |
| **Unit Testing** | `npm test` | **16 / 16 PASSED** (Vitest) |
| **TypeScript Compilation** | `npx tsc --noEmit` | **0 ERRORS** |
| **Code Linting** | `npm run lint` | **0 ERRORS** |
| **Production Build** | `npm run build` | **SUCCESS** (22 static & dynamic routes compiled) |

---

## 📝 Manual Verification Checklist

Run these commands against your deployment or local database to verify each security control:

### 1. Payment Verification Bypass Prevention
Attempt to verify payment with `is_simulated: true` when `PAYMENTS_MODE=live` or in production:
```bash
curl -X POST https://irlsocial.in/api/payments/verify \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_test_123",
    "razorpay_payment_id": "pay_test_123",
    "razorpay_signature": "fake_sig",
    "is_simulated": true
  }'
```
*Expected Result*: Returns HTTP `401` (Unauthenticated) or `404` (Order not found). `is_simulated` from client is completely ignored.

### 2. Client Direct Pass Insertion Prevention
Execute direct pass insert from browser console / client Supabase anon client:
```javascript
const { data, error } = await supabase.from('passes').insert({
  event_id: '11111111-1111-1111-1111-111111111101',
  user_id: (await supabase.auth.getUser()).data.user.id,
  tier_id: '11111111-1111-1111-1111-111111111101',
  status: 'valid'
});
console.log(error);
```
*Expected Result*: Returns Supabase RLS error: `new row violates row-level security policy for table "passes"`.

### 3. Role Self-Promotion Prevention
Execute direct role PATCH from browser console / client Supabase anon client:
```javascript
const { data, error } = await supabase.from('profiles').update({
  role: 'partner'
}).eq('id', (await supabase.auth.getUser()).data.user.id);
console.log(error);
```
*Expected Result*: Fails with PostgreSQL trigger exception: `Unauthorized attempt to change profile role`.

### 4. Profile Email Privacy Verification
Query `profiles` table as an unauthenticated or non-owner user:
```javascript
const { data, error } = await supabase.from('profiles').select('email');
console.log(data);
```
*Expected Result*: Returns `[]` or filtered results containing only the current user's own profile row.

---

## 📋 Required Manual Action Items for Live Launch

Before pushing these changes to production, perform the following manual steps:

1. **Run Supabase Database Migration**:
   Execute the migration SQL file in your Supabase SQL Editor:
   `supabase/migrations/20261009040000_security_hardening.sql`

2. **Set New Vercel Environment Variables**:
   Add the following environment variables in Vercel Project Settings:
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key (from Supabase Dashboard -> Project Settings -> API).
   - `PAYMENTS_MODE`: Set to `live` for production deployment.
   - `RAZORPAY_KEY_ID`: Live Razorpay Key ID (`rzp_live_...`).
   - `RAZORPAY_KEY_SECRET`: Live Razorpay Key Secret.
   - `RAZORPAY_WEBHOOK_SECRET`: Live Webhook secret generated in Razorpay Dashboard.

3. **Rotate Exposed Credentials**:
   If test/development keys (`rzp_test_irl_app_2026` or placeholder webhook secrets) were ever committed to remote repositories or used in public environments, generate fresh credentials in the Razorpay Dashboard.
