/**
 * Shared external links used across email templates.
 * Centralised so rotation (e.g. when the Discord invite is regenerated) is a
 * one-line change instead of editing every template. The env override lets
 * release pipelines or local previews inject a fresh URL without a code change.
 */
function env(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export const DISCORD_INVITE_URL =
  env("STAGE_DISCORD_INVITE_URL") ?? "https://discord.gg/z4ZAKu6r29";

/** Stripe customer portal login — recipients enter email to manage/cancel billing. */
export const STRIPE_BILLING_PORTAL_LOGIN_URL =
  env("STAGE_STRIPE_BILLING_PORTAL_LOGIN_URL") ??
  "https://billing.stripe.com/p/login/6oU8wPd726nA3RXf3fd7q00";
