import { afterEach, describe, expect, test, vi } from "vitest";

// The old $29 "Stage Pro — Monthly" price became Stage Solo. If that price is still in an
// old Pro setting as well as the Solo one, Stage must read it as Solo, never Studio.
const SOLO_PRICE = "price_old_pro_now_solo";

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

describe("price to plan", () => {
  test("a price in both the Solo and an old Pro setting is Solo", async () => {
    const { resolveTier } = await loadWith({ STRIPE_SOLO_MONTHLY_PRICE_ID: SOLO_PRICE, STRIPE_PRO_MONTHLY_PRICE_ID: SOLO_PRICE });
    expect(resolveTier(SOLO_PRICE)).toBe("start");
  });

  test("Studio and Agency prices keep their plan", async () => {
    const { resolveTier } = await loadWith({
      STRIPE_SOLO_MONTHLY_PRICE_ID: SOLO_PRICE,
      STRIPE_STUDIO_BASE_MONTHLY_PRICE_ID: "price_studio",
      STRIPE_AGENCY_MONTHLY_PRICE_ID: "price_agency",
    });
    expect(resolveTier("price_studio")).toBe("pro");
    expect(resolveTier("price_agency")).toBe("team");
  });
});
