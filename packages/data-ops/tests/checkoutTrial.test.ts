import { getFunctionName } from "convex/server";
import { beforeEach, describe, expect, test, vi } from "vitest";

const stripe = { retrieve: vi.fn(), update: vi.fn() };
vi.mock("stripe", () => ({
  default: class {
    subscriptions = { retrieve: stripe.retrieve, update: stripe.update };
  },
}));
vi.mock("../convex/helpers/env", () => ({
  getEnv: (name: string) => ({ STRIPE_STUDIO_BASE_MONTHLY_PRICE_ID: "price_studio" })[name],
  requireEnv: () => "sk_test",
}));

const { creditWebhookEvents } = await import("../convex/lib/billing/handlers/webhooks");

const USER = "user_1";

// A webhook ctx that records the mutations it is asked to run.
function fakeCtx(syncedSubscription: object | null = null) {
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  const ctx = {
    runQuery: vi.fn(async () => syncedSubscription),
    runMutation: vi.fn(async (ref: Parameters<typeof getFunctionName>[0], args: Record<string, unknown>) => {
      calls.push({ name: getFunctionName(ref), args });
    }),
    runAction: vi.fn(),
    scheduler: { runAfter: vi.fn() },
  };
  const grants = () => calls.filter((call) => call.name.endsWith("grantCreditsForOwner")).map((call) => call.args);
  return { ctx: ctx as never, grants };
}

function checkoutCompleted(id: string, discounts: object[]) {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        subscription: "sub_1",
        discounts,
        metadata: { userId: USER, priceId: "price_studio", isTrial: "true" },
      },
    },
  } as never;
}

beforeEach(() => {
  stripe.retrieve.mockReset();
  stripe.update.mockReset();
});

describe("trial checkout with a promotion code", () => {
  test("ends the trial now and grants no trial credits", async () => {
    stripe.retrieve.mockResolvedValue({ id: "sub_1", status: "trialing" });
    const { ctx, grants } = fakeCtx();
    await creditWebhookEvents["checkout.session.completed"](ctx, checkoutCompleted("evt_1", [{ promotion_code: "promo_1" }]));
    expect(stripe.update).toHaveBeenCalledWith("sub_1", { trial_end: "now" });
    expect(grants()).toEqual([]);
  });

  test("a repeated event leaves an already started plan alone", async () => {
    stripe.retrieve.mockResolvedValue({ id: "sub_1", status: "active" });
    const { ctx, grants } = fakeCtx();
    await creditWebhookEvents["checkout.session.completed"](ctx, checkoutCompleted("evt_1", [{ promotion_code: "promo_1" }]));
    expect(stripe.update).not.toHaveBeenCalled();
    expect(grants()).toEqual([]);
  });

  test("the invoice that follows grants the plan's full credits", async () => {
    const { ctx, grants } = fakeCtx({ stripeSubscriptionId: "sub_1", status: "active", priceId: "price_studio", userId: USER });
    const invoice = { id: "evt_2", type: "invoice.paid", data: { object: { billing_reason: "subscription_update", parent: { subscription_details: { subscription: "sub_1" } }, lines: { data: [] } } } } as never;
    await creditWebhookEvents["invoice.paid"](ctx, invoice);
    expect(grants()).toEqual([{ ownerUserId: USER, credits: 10000, reason: "monthly_grant", idempotencyKey: "evt_2" }]);
  });
});

describe("trial checkout without a code", () => {
  test("keeps the trial and grants the trial credits once per event", async () => {
    const { ctx, grants } = fakeCtx();
    await creditWebhookEvents["checkout.session.completed"](ctx, checkoutCompleted("evt_3", []));
    expect(stripe.retrieve).not.toHaveBeenCalled();
    expect(grants()).toEqual([{ ownerUserId: USER, credits: 150, reason: "trial_grant", idempotencyKey: "evt_3" }]);
  });
});
