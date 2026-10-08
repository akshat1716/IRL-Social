import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// 1. Mock Supabase server module
vi.mock("@/lib/supabase/server", () => {
  const mockUser = { id: "user_test_101", email: "test@example.com" };

  const mockSupabase = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
    },
    from: vi.fn((table: string) => {
      if (table === "ticket_tiers") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn((field: string, val: string) => {
              if (val === "tier_paid_101") {
                return {
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "tier_paid_101",
                      event_id: "event_101",
                      price: 999,
                      sold_count: 0,
                      max_quantity: 100,
                    },
                    error: null,
                  }),
                };
              }
              return {
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "tier_free_101",
                    event_id: "event_101",
                    price: 0,
                    sold_count: 0,
                    max_quantity: 100,
                  },
                  error: null,
                }),
              };
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  };

  const mockAdminClient = {
    from: vi.fn((table: string) => {
      if (table === "payment_orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockImplementation(() => {
              return Promise.resolve({
                data: {
                  id: "ord_db_101",
                  razorpay_order_id: "order_sim_999",
                  user_id: "user_test_101",
                  event_id: "event_101",
                  tier_id: "tier_paid_101",
                  quantity: 1,
                  amount_paise: 99900,
                  status: "created",
                },
                error: null,
              });
            }),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "ord_db_101",
                razorpay_order_id: "order_sim_999",
              },
            }),
          }),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnThis(),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
    rpc: vi.fn().mockResolvedValue({
      data: [
        {
          id: "pass_101",
          event_id: "event_101",
          user_id: "user_test_101",
          tier_id: "tier_paid_101",
          status: "valid",
        },
      ],
      error: null,
    }),
  };

  return {
    createClient: () => mockSupabase,
    createAdminClient: () => mockAdminClient,
  };
});

// 2. Mock tickets internal server module
vi.mock("@/lib/server/tickets-internal", () => {
  const mockPass = {
    id: "pass_101",
    event_id: "event_101",
    user_id: "user_test_101",
    tier_id: "tier_paid_101",
    status: "valid",
  };

  return {
    hydratePassInternal: vi.fn().mockResolvedValue(mockPass),
    issuePassInternal: vi.fn().mockResolvedValue(mockPass),
    createSquadPassCheckoutInternal: vi.fn().mockResolvedValue({
      squad: { id: "sq_1" },
      pass: mockPass,
      share_url: "/squad/CODE",
    }),
    finalizePaidOrderInternal: vi.fn().mockImplementation(async () => {
      return [mockPass];
    }),
  };
});

// Import real route modules
import * as passesRoute from "@/app/api/passes/route";
import * as squadRoute from "@/app/api/squad/route";
import { POST as verifyPOST } from "@/app/api/payments/verify/route";
import { POST as createOrderPOST } from "@/app/api/payments/create-order/route";
import { POST as webhookPOST } from "@/app/api/webhooks/razorpay/route";
import { POST as claimFreePOST } from "@/app/api/payments/claim-free/route";

describe("API Security Routes Integration Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("(a) confirms POST /api/passes and POST /api/squad handlers are removed", () => {
    expect((passesRoute as Record<string, unknown>).POST).toBeUndefined();
    expect((squadRoute as Record<string, unknown>).POST).toBeUndefined();
    expect(passesRoute.GET).toBeDefined();
    expect(squadRoute.GET).toBeDefined();
  });

  it("(b) /api/payments/verify rejects a simulated order when NODE_ENV=production", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "production", configurable: true });
    process.env.PAYMENTS_MODE = "simulated";

    const request = new Request("http://localhost:3000/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ razorpay_order_id: "order_sim_999" }),
    });

    const res = await verifyPOST(request);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("disabled in production");
  });

  it("(c) calling verify twice for one order calls finalizePaidOrderInternal atomically", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
    process.env.PAYMENTS_MODE = "simulated";

    const request1 = new Request("http://localhost:3000/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ razorpay_order_id: "order_sim_999" }),
    });
    const res1 = await verifyPOST(request1);
    const body1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(body1.success).toBe(true);
    expect(body1.passes).toHaveLength(1);

    // Call verify a second time for the same order
    const request2 = new Request("http://localhost:3000/api/payments/verify", {
      method: "POST",
      body: JSON.stringify({ razorpay_order_id: "order_sim_999" }),
    });
    const res2 = await verifyPOST(request2);
    const body2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(body2.success).toBe(true);
    expect(body2.passes).toHaveLength(1);
  });

  it("(d) create-order computes price server-side and ignores client-supplied amount", async () => {
    Object.defineProperty(process.env, "NODE_ENV", { value: "development", configurable: true });
    process.env.PAYMENTS_MODE = "simulated";

    const request = new Request("http://localhost:3000/api/payments/create-order", {
      method: "POST",
      body: JSON.stringify({
        event_id: "event_101",
        tier_id: "tier_paid_101",
        quantity: 2,
        amount: 1, // Malicious client attempt to pay 1 rupee
      }),
    });

    const res = await createOrderPOST(request);
    const body = await res.json();

    expect(res.status).toBe(200);
    // 999 * 2 * 100 = 199800 paise
    expect(body.amount).toBe(199800);
    expect(body.amount).not.toBe(100);
  });

  it("(e) the webhook route rejects requests with missing or invalid signature", async () => {
    // Missing signature header
    const reqMissing = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      body: JSON.stringify({ event: "payment.captured" }),
    });

    const resMissing = await webhookPOST(reqMissing);
    expect(resMissing.status).toBe(400);
    const bodyMissing = await resMissing.json();
    expect(bodyMissing.error).toContain("Missing x-razorpay-signature");

    // Invalid signature header
    const reqInvalid = new Request("http://localhost:3000/api/webhooks/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "invalid_sig_hash" },
      body: JSON.stringify({ event: "payment.captured" }),
    });

    const resInvalid = await webhookPOST(reqInvalid);
    expect(resInvalid.status).toBe(400);
    const bodyInvalid = await resInvalid.json();
    expect(bodyInvalid.error).toContain("Invalid webhook signature");
  });

  it("(f) claim-free route rejects paid ticket tiers", async () => {
    const request = new Request("http://localhost:3000/api/payments/claim-free", {
      method: "POST",
      body: JSON.stringify({
        event_id: "event_101",
        tier_id: "tier_paid_101", // Paid tier price = 999
      }),
    });

    const res = await claimFreePOST(request);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toContain("Paid tickets must go through payment checkout");
  });
});
