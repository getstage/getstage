/**
 * Shared external links used across email templates.
 *
 * Centralised so rotation (e.g. when a Slack invite expires) is a one-line
 * change instead of editing every template. The env override lets release
 * pipelines or local previews inject a fresh URL without a code change.
 */
function env(name: string) {
  return (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[
    name
  ];
}

export const SLACK_INVITE_URL =
  env("STAGE_SLACK_INVITE_URL") ??
  "https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ";

/** Stripe customer portal login — recipients enter email to manage/cancel billing. */
export const STRIPE_BILLING_PORTAL_LOGIN_URL =
  env("STAGE_STRIPE_BILLING_PORTAL_LOGIN_URL") ??
  "https://billing.stripe.com/p/login/6oU8wPd726nA3RXf3fd7q00";
