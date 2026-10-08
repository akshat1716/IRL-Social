# IRL Social — Real-World Social & Event Platform

**IRL Social** (`irlsocial.in`) is a full-stack, high-performance event ticketing and community social platform built with Next.js 14, Supabase (PostgreSQL), and Razorpay Payment Gateway. It powers daytime run clubs, nightlife parties, sports matchmaking, and board game mixers with real-time pass generation, instant UPI/Card payments, squad split-checkout, and camera-based door scanner validation.

---

## 🚀 Key Features

- **Event Discovery & Matchmaking**: Daytime run clubs, nightlife DJ sets, open badminton doubles, and board game mixers with live capacity indicators.
- **Hardened Payment Gateway (Razorpay)**: Server-authenticated order creation, constant-time HMAC signature verification, atomic pass settlement, and rate-limited free ticket claims.
- **Squad Checkout & Split Payments**: Instant group pass generation allowing friends to pay individually via custom share codes.
- **Camera QR Scanner & Venue Gatekeeping**: Real-time pass scanner for door staff and venue partners with race-safe check-in recording (`check_ins`).
- **Granular Security Controls**: Public profile sanitization, role elevation triggers, and restricted Supabase RLS policies preventing direct browser pass tampering.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 14 (App Router, React Server Components, Server Actions)
- **Database & Auth**: Supabase PostgreSQL + Auth (`@supabase/ssr`, Row Level Security)
- **Payments**: Razorpay Node SDK (`razorpay`), Webhooks, Instant UPI & Deep Links
- **State & UI**: Tailwind CSS, Lucide Icons, QR Code Generators (`qrcode.react`), HTML5 Camera Scanner (`html5-qrcode`), React Query, Zustand
- **Testing**: Vitest (`vitest`)

---

## 🏗️ Architecture & Payment Flow

```
[User Selects Pass] 
       │
       ▼
[POST /api/payments/create-order] ──► Validates Tier Stock & Server-Calculates Amount ──► Saves order in `payment_orders` (status: created)
       │
       ▼
[Razorpay Checkout SDK / Instant UPI] ──► User completes payment
       │
       ▼
[POST /api/payments/verify] ──► Validates HMAC SHA-256 (Constant-Time) ──► Atomically marks `payment_orders` (status: paid) ──► Calls `issue_pass_atomic()`
       │
       ▼
[Door Scanner / Staff] ──► Scans Pass QR Code Hash ──► Checks Venue Authorization ──► Inserts `check_ins` (Atomic double-scan prevention)
```

---

## 🔐 Environment Variables

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client + Server) | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client + Server) | Supabase Anonymous API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Privileged Service Role Key (Bypasses RLS for settlements) |
| `PAYMENTS_MODE` | **Server-Only** | Set to `live` (Production) or `simulated` (Local Dev). Hard-disabled in Production. |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Public (Client + Server) | Razorpay Merchant Key ID |
| `RAZORPAY_KEY_SECRET` | **Server-Only** | Razorpay Merchant Secret Key |
| `RAZORPAY_WEBHOOK_SECRET` | **Server-Only** | Secret configured in Razorpay Webhook dashboard |

---

## 🗄️ Supabase Setup & Database Migrations

1. **Initial Schema**: Run `supabase/schema.sql` in the Supabase SQL Editor to initialize all tables, views, enums, triggers, and RLS policies.
2. **Apply Security Migration**: Run `supabase/migrations/20261009040000_security_hardening.sql` on existing installations to update RLS rules, role escalation triggers, and `issue_pass_atomic()` procedures.
3. **Seed Data (Optional)**: Run `npm run seed` or inspect `scripts/seed.mjs` to populate sample venues and events.

---

## 💳 Razorpay & Webhook Configuration

1. Log into your **Razorpay Dashboard** (Test or Live Mode).
2. Copy your `Key ID` and `Key Secret` into `.env.local`.
3. Navigate to **Settings -> Webhooks** and add a new webhook pointing to `https://your-domain.com/api/webhooks/razorpay`.
4. Select `payment.captured`, `order.paid`, and `payment.failed` events, and set your webhook secret in `RAZORPAY_WEBHOOK_SECRET`.

---

## 🛡️ Security & Hardening Controls

This codebase implements enterprise-grade backend security controls:

1. **Payment Verification Hardening**: Client-side parameters (such as `amount`, `quantity`, or `is_simulated`) are strictly untrusted. Order amounts are computed server-side from `ticket_tiers.price`. HMAC signatures are verified using `crypto.timingSafeEqual()`.
2. **Replay & Overselling Protection**: Orders are persisted in `payment_orders`. Replay verification requests return already-issued passes without duplicate minting. Pass creation locks rows (`SELECT FOR UPDATE`) inside the `issue_pass_atomic` PostgreSQL function.
3. **Pass Insert / Update Restriction**: Browser clients using `NEXT_PUBLIC_SUPABASE_ANON_KEY` are stripped of INSERT/UPDATE rights on `passes`. Passes can only be issued via server actions or the admin service role.
4. **Role Self-Promotion Prevention**: A `BEFORE UPDATE` trigger (`prevent_profile_role_escalation`) on `profiles` raises an exception if a user attempts to update their `role` column directly.
5. **PII Protection**: Profile `email` and `phone` are restricted to the account owner and scanner staff. Public components query the sanitized `public_profiles` view (`id`, `name`, `avatar_url`).

---

## 🧪 Local Development & Testing

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run Next.js local development server
npm run dev

# Run TypeScript checking & linting
npm run lint
npx tsc --noEmit
```
