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
  // Seats baked into this price. 1 for Start/Pro base, 3 for Team base, 0 for the
  // per-seat add-on (its quantity is the extra-seat count) and top-ups.
  includedSeats: number;
  // Credits granted when a top-up checkout succeeds. 0 for subscriptions.
  topupCredits: number;
  isSeatAddOn: boolean;
};

const TIER_MONTHLY_CREDITS: Record<Tier, number> = {
  start: 5000,
  pro: 10000,
  team: 18000,
};

const TIER_INCLUDED_SEATS: Record<Tier, number> = {
  start: 1,
  pro: 1,
  team: 3,
};

// Credits a Team seat add-on grants into the shared pool per extra seat.
export const SEAT_ADDON_CREDITS = 5000;

// Hard cap during trial (no full monthly grant until trial converts).
export const TRIAL_CREDIT_CAP = 150;

const TOPUP_CREDITS: Record<"small" | "medium" | "large", number> = {
  small: 3000,
  medium: 7500,
  large: 18000,
};

const TIER_PRICE_ENV: Record<Tier, Record<BillingCycle, string>> = {
  start: { monthly: "STRIPE_START_MONTHLY_PRICE_ID", yearly: "STRIPE_START_YEARLY_PRICE_ID" },
  pro: { monthly: "STRIPE_PRO_MONTHLY_PRICE_ID", yearly: "STRIPE_PRO_YEARLY_PRICE_ID" },
  team: { monthly: "STRIPE_TEAM_BASE_MONTHLY_PRICE_ID", yearly: "STRIPE_TEAM_BASE_YEARLY_PRICE_ID" },
};

const SEAT_ADDON_ENV: Record<BillingCycle, string> = {
  monthly: "STRIPE_TEAM_SEAT_MONTHLY_PRICE_ID",
  yearly: "STRIPE_TEAM_SEAT_YEARLY_PRICE_ID",
};

const TOPUP_ENV: Record<"small" | "medium" | "large", string> = {
  small: "STRIPE_TOPUP_SMALL_PRICE_ID",
  medium: "STRIPE_TOPUP_MEDIUM_PRICE_ID",
  large: "STRIPE_TOPUP_LARGE_PRICE_ID",
};

let cache: Record<string, PriceConfig> | null = null;

function subscriptionConfig(
  tier: Tier,
  billingCycle: BillingCycle,
): PriceConfig {
  return {
    tier,
    kind: "subscription",
    billingCycle,
    monthlyCredits: TIER_MONTHLY_CREDITS[tier],
    includedSeats: TIER_INCLUDED_SEATS[tier],
    topupCredits: 0,
    isSeatAddOn: false,
  };
}

function seatAddOnConfig(billingCycle: BillingCycle): PriceConfig {
  return {
    tier: "team",
    kind: "subscription",
    billingCycle,
    monthlyCredits: 0,
    includedSeats: 0,
    topupCredits: 0,
    isSeatAddOn: true,
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
    isSeatAddOn: false,
  };
}

function buildMap(): Record<string, PriceConfig> {
  const map: Record<string, PriceConfig> = {};
  const add = (priceId: string | undefined, cfg: PriceConfig) => {
    if (priceId) {
      map[priceId] = cfg;
    }
  };

  (["start", "pro", "team"] as Tier[]).forEach((tier) => {
    add(getEnv(TIER_PRICE_ENV[tier].monthly), subscriptionConfig(tier, "monthly"));
    add(getEnv(TIER_PRICE_ENV[tier].yearly), subscriptionConfig(tier, "yearly"));
  });

  add(getEnv(SEAT_ADDON_ENV.monthly), seatAddOnConfig("monthly"));
  add(getEnv(SEAT_ADDON_ENV.yearly), seatAddOnConfig("yearly"));

  (["small", "medium", "large"] as const).forEach((size) => {
    add(getEnv(TOPUP_ENV[size]), topupConfig(size));
  });

  return map;
}

function priceConfigMap(): Record<string, PriceConfig> {
  if (!cache) {
    cache = buildMap();
  }
  return cache;
}

export function configForPriceId(priceId: string | null | undefined): PriceConfig | null {
  if (!priceId) {
    return null;
  }
  return priceConfigMap()[priceId] ?? null;
}

export function tierForPriceId(priceId: string | null | undefined): Tier | null {
  return configForPriceId(priceId)?.tier ?? null;
}

export function isSeatAddOnPrice(priceId: string | null | undefined): boolean {
  return configForPriceId(priceId)?.isSeatAddOn ?? false;
}

export function monthlyCreditsForTier(tier: Tier): number {
  return TIER_MONTHLY_CREDITS[tier];
}

export function includedSeatsForTier(tier: Tier): number {
  return TIER_INCLUDED_SEATS[tier];
}

// Resolve the subscription base priceId for a tier + cycle. Throws if not configured.
export function priceIdForTier(tier: Tier, billingCycle: BillingCycle): string {
  const id = getEnv(TIER_PRICE_ENV[tier][billingCycle]);
  if (!id) {
    throw new Error(`${tier} ${billingCycle} checkout is not configured yet.`);
  }
  return id;
}

// Resolve the Team seat add-on priceId, or null if seats aren't configured.
export function seatAddOnPriceId(billingCycle: BillingCycle): string | null {
  return getEnv(SEAT_ADDON_ENV[billingCycle]) ?? null;
}

export function billingCycleForPriceId(priceId: string | null | undefined): BillingCycle {
  return configForPriceId(priceId)?.billingCycle ?? "yearly";
}

const LEGACY_PRO_PRICE_ENVS = [
  "STRIPE_PRICE_ID",
  "STRIPE_YEARLY_PRICE_ID",
  "STRIPE_MONTHLY_PRICE_ID",
  "STRIPE_YEARLY_PRICE_LAUNCH_ID",
];

// Fail closed on unknown price IDs, but keep legacy single-tier subscribers recognized.
export function resolveTier(priceId: string | null | undefined): Tier | null {
  const tier = tierForPriceId(priceId);
  if (tier) {
    return tier;
  }
  const legacyIds = LEGACY_PRO_PRICE_ENVS.map((env) => getEnv(env)).filter(
    (value): value is string => Boolean(value),
  );
  if (priceId && legacyIds.includes(priceId)) {
    return "pro";
  }
  return null;
}
