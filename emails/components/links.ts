/**
 * Shared external links used across email templates.
 *
 * Centralised so rotation (e.g. when a Slack invite expires) is a one-line
 * change instead of editing every template. The env override lets release
 * pipelines or local previews inject a fresh URL without a code change.
 */

export const SLACK_INVITE_URL =
  process.env.STAGE_SLACK_INVITE_URL ??
  "https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ";
