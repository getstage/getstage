import { Resend } from "@convex-dev/resend";
import { components, internal } from "../../_generated/api";
import { getEnv } from "../../helpers/env";

// Single Resend component instance for the whole email drip engine.
//
// testMode: the component defaults to true (only delivers to Resend test
// addresses). We ship LIVE — adrien@getstage.co / getstage.co is verified — so
// we read EMAILS_TEST_MODE and treat anything other than the literal "true" as
// live. Set EMAILS_TEST_MODE=true on a deployment to lock it down again.
//
// The component reads RESEND_API_KEY itself; on Convex set RESEND_API_KEY to the
// same value as the existing STAGE_RESEND_API_KEY (no new key).
//
// onEmailEvent is the delivery-feedback callback (delivered/bounced/opened) —
// see emails.ts handleEmailEvent, which updates the scheduledEmails row status.
export const resend: Resend = new Resend(components.resend, {
  // Reuse the existing STAGE_RESEND_API_KEY directly — no need to also set
  // RESEND_API_KEY. If STAGE_RESEND_API_KEY is absent the component falls back
  // to RESEND_API_KEY, so both work.
  apiKey: getEnv("STAGE_RESEND_API_KEY"),
  testMode: getEnv("EMAILS_TEST_MODE") === "true",
  onEmailEvent: internal.emails.handleEmailEvent,
});

export const EMAIL_FROM = "Adrien <adrien@getstage.co>";
