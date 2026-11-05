import { afterEach, describe, expect, test, vi } from "vitest";

// Convex throws on an invalid setting name (e.g. ""); the test env must do the same.
const VALID_ENV_NAME = /^[A-Za-z][A-Za-z0-9_]*$/;

async function loadWith(env: Record<string, string>) {
  vi.resetModules();
  vi.doMock("../convex/helpers/env", () => ({
    getEnv: (name: string) => {
      if (!VALID_ENV_NAME.test(name)) throw new Error(`The environment variable name ${name} is invalid.`);
      return env[name];
    },
  }));
  return import("../convex/lib/credits/priceConfig");
}

afterEach(() => vi.doUnmock("../convex/helpers/env"));

const CURRENT = {
  STRIPE_SOLO_MONTHLY_PRICE_ID: "price_solo",
  STRIPE_STUDIO_BASE_MONTHLY_PRICE_ID: "price_studio",
  STRIPE_AGENCY_MONTHLY_PRICE_ID: "price_agency",
};

describe("checkout price", () => {
  test("uses the plan's own price", async () => {
    const { priceIdForTier } = await loadWith(CURRENT);
    expect(priceIdForTier("start", "monthly")).toBe("price_solo");
    expect(priceIdForTier("pro", "monthly")).toBe("price_studio");
    expect(priceIdForTier("team", "monthly")).toBe("price_agency");
  });

  test("fails when the plan's price is missing, even if old settings exist", async () => {
    const { priceIdForTier } = await loadWith({
      STRIPE_PRO_MONTHLY_PRICE_ID: "price_old_pro",
      STRIPE_PRICE_ID: "price_old",
      STRIPE_STUDIO_BASE_MONTHLY_OLD_PRICE_IDS: "price_old_studio",
    });
    expect(() => priceIdForTier("pro", "monthly")).toThrow("Studio monthly checkout is not configured (STRIPE_STUDIO_BASE_MONTHLY_PRICE_ID).");
  });
});

describe("price to plan", () => {
  test("current prices map to their plan", async () => {
    const { tierForPriceId } = await loadWith(CURRENT);
    expect(tierForPriceId("price_solo")).toBe("start");
    expect(tierForPriceId("price_studio")).toBe("pro");
    expect(tierForPriceId("price_agency")).toBe("team");
  });

  test("old prices count only for the plan they are listed under", async () => {
    const { tierForPriceId, billingCycleForPriceId } = await loadWith({
      ...CURRENT,
      STRIPE_SOLO_MONTHLY_OLD_PRICE_IDS: "price_old_pro_29, price_older",
    });
    expect(tierForPriceId("price_old_pro_29")).toBe("start");
    expect(tierForPriceId("price_older")).toBe("start");
    expect(billingCycleForPriceId("price_old_pro_29")).toBe("monthly");
  });

  test("old setting names are never read", async () => {
    const { tierForPriceId } = await loadWith({ ...CURRENT, STRIPE_PRO_MONTHLY_PRICE_ID: "price_old_pro_29", STRIPE_PRICE_ID: "price_old" });
    expect(tierForPriceId("price_old_pro_29")).toBeNull();
    expect(tierForPriceId("price_old")).toBeNull();
  });

  test("a price set for two plans is unknown instead of guessed", async () => {
    const { tierForPriceId } = await loadWith({ ...CURRENT, STRIPE_STUDIO_BASE_MONTHLY_OLD_PRICE_IDS: "price_solo" });
    expect(tierForPriceId("price_solo")).toBeNull();
    expect(tierForPriceId("price_studio")).toBe("pro");
  });
});
