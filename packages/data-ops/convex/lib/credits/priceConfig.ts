import { getEnv } from "../../helpers/env";

// Single source of truth mapping a Stripe priceId to its Stage billing config.
// Built from env vars so deploy-time price IDs never require code changes.
// Locked numbers live here, not scattered across handlers.

export type Tier = "start" | "pro" | "team";
export type BillingCycle = "monthly" | "yearly";
export type PriceKind = "subscription" | "topup";

export type PriceConfig = {
  tier: Tier;
  kind: PriceKind;
  billingCycle: BillingCycle;
  // Credits granted when a subscription checkout/renewal succeeds. 0 for top-ups.
  monthlyCredits: number;
  // Seats baked into this price. Top-ups use 0.
  includedSeats: number;
  // Credits granted when a top-up checkout succeeds. 0 for subscriptions.
  topupCredits: number;
};

const TIER_MONTHLY_CREDITS: Record<Tier, number> = {
  start: 2000,
  pro: 10000,
  team: 30000,
};

const TIER_INCLUDED_SEATS: Record<Tier, number> = {
  start: 1,
  pro: 5,
  team: 15,
};

// Hard cap during trial (no full monthly grant until trial converts).
export const TRIAL_CREDIT_CAP = 150;

const TOPUP_CREDITS: Record<"small" | "medium" | "large", number> = {
  small: 3000,
  medium: 7500,
  large: 18000,
};

const TOPUP_ENV: Record<"small" | "medium" | "large", string> = {
  small: "STRIPE_TOPUP_SMALL_PRICE_ID",
  medium: "STRIPE_TOPUP_MEDIUM_PRICE_ID",
  large: "STRIPE_TOPUP_LARGE_PRICE_ID",
};

// Every plan has exactly one Stripe price per billing cycle. Checkout only ever uses that
// setting: when it is missing, checkout fails. It never falls back to another setting.
// Internal keys stay stable: start = Solo, pro = Studio, team = Agency.
const PLAN_ENV_NAME: Record<Tier, string> = { start: "SOLO", pro: "STUDIO_BASE", team: "AGENCY" };
const PLAN_LABEL: Record<Tier, string> = { start: "Solo", pro: "Studio", team: "Agency" };
const TIERS: Tier[] = ["start", "pro", "team"];
const BILLING_CYCLES: BillingCycle[] = ["monthly", "yearly"];

export function planPriceEnv(tier: Tier, billingCycle: BillingCycle) {
  return `STRIPE_${PLAN_ENV_NAME[tier]}_${billingCycle.toUpperCase()}_PRICE_ID`;
}

// Older prices that existing subscribers still pay, listed explicitly under the plan they
// belong to (comma-separated), e.g. STRIPE_SOLO_MONTHLY_OLD_PRICE_IDS. Never used for checkout.
export function oldPriceIdsEnv(tier: Tier, billingCycle: BillingCycle) {
  return `STRIPE_${PLAN_ENV_NAME[tier]}_${billingCycle.toUpperCase()}_OLD_PRICE_IDS`;
}

function subscriptionConfig(tier: Tier, billingCycle: BillingCycle): PriceConfig {
  return {
    tier,
    kind: "subscription",
    billingCycle,
    monthlyCredits: TIER_MONTHLY_CREDITS[tier],
    includedSeats: TIER_INCLUDED_SEATS[tier],
    topupCredits: 0,
  };
}

function topupConfig(size: "small" | "medium" | "large"): PriceConfig {
  return {
    tier: "pro",
    kind: "topup",
    billingCycle: "monthly",
    monthlyCredits: 0,
    includedSeats: 0,
    topupCredits: TOPUP_CREDITS[size],
  };
}

function listedPriceIds(env: string) {
  return (getEnv(env) ?? "")
    .split(",")
    .map((priceId) => priceId.trim())
    .filter(Boolean);
}

type PriceEntry = { priceId: string; config: PriceConfig; source: string };

function configuredPrices(): PriceEntry[] {
  const plans = TIERS.flatMap((tier) =>
    BILLING_CYCLES.flatMap((billingCycle) => {
      const config = subscriptionConfig(tier, billingCycle);
      const current = planPriceEnv(tier, billingCycle);
      const old = oldPriceIdsEnv(tier, billingCycle);
      return [
        ...listedPriceIds(current).map((priceId) => ({ priceId, config, source: current })),
        ...listedPriceIds(old).map((priceId) => ({ priceId, config, source: old })),
      ];
    }),
  );
  const topups = (["small", "medium", "large"] as const).flatMap((size) =>
    listedPriceIds(TOPUP_ENV[size]).map((priceId) => ({ priceId, config: topupConfig(size), source: TOPUP_ENV[size] })),
  );
  return [...plans, ...topups];
}

function samePlan(a: PriceConfig, b: PriceConfig) {
  return a.kind === b.kind && a.tier === b.tier && a.billingCycle === b.billingCycle && a.topupCredits === b.topupCredits;
}

// A price set for two different plans is a configuration error. Stage then treats that price
// as unknown (no plan) instead of guessing, and logs which settings collide.
function buildMap(): Map<string, PriceConfig> {
  const map = new Map<string, PriceConfig>();
  const sources = new Map<string, string>();
  const conflicts = new Set<string>();
  for (const { priceId, config, source } of configuredPrices()) {
    const existing = map.get(priceId);
    if (existing && !samePlan(existing, config)) {
      conflicts.add(priceId);
      console.error(`Stripe price ${priceId} is set in both ${sources.get(priceId)} and ${source}; treating it as unknown.`);
    }
    if (!existing) {
      map.set(priceId, config);
      sources.set(priceId, source);
    }
  }
  for (const priceId of conflicts) map.delete(priceId);
  return map;
}

let cache: Map<string, PriceConfig> | undefined;

function priceConfigMap() {
  cache ??= buildMap();
  return cache;
}

export function configForPriceId(priceId: string | null | undefined): PriceConfig | null {
  if (!priceId) {
    return null;
  }
  return priceConfigMap().get(priceId) ?? null;
}

// Fails closed: a price Stage doesn't know gives no plan.
export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  return configForPriceId(priceId)?.tier ?? null;
}

export function monthlyCreditsForTier(tier: Tier): number {
  return TIER_MONTHLY_CREDITS[tier];
}

export function includedSeatsForTier(tier: Tier): number {
  return TIER_INCLUDED_SEATS[tier];
}

// The one price checkout uses for a plan + cycle. Throws when it is not configured.
export function priceIdForTier(tier: Tier, billingCycle: BillingCycle): string {
  const env = planPriceEnv(tier, billingCycle);
  const priceId = getEnv(env)?.trim();
  if (!priceId) {
    throw new Error(`${PLAN_LABEL[tier]} ${billingCycle} checkout is not configured (${env}).`);
  }
  return priceId;
}

export function billingCycleForPriceId(priceId: string | null | undefined): BillingCycle {
  return configForPriceId(priceId)?.billingCycle ?? "yearly";
}
