import type { StageEmailTemplate } from "stage-emails";

// The 4 drip-relevant events. onboarding_complete is intentionally NOT here —
// it's recorded as an audit row only (see recordEmailEvent callers).
export type EmailEventType =
  | "signed_up"
  | "app_downloaded"
  | "trial_started"
  | "payment_confirmed";

export type EmailFlow = "trial" | "retention";

export interface EmailStep {
  flow: EmailFlow;
  template: StageEmailTemplate;
  delayMs: number;
  subject: string;
}

const MIN = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

// Keep in sync with lib/billing/handlers/index.ts TRIAL_DAYS. Email 5 fires
// one day before the trial ends, so its delay is (TRIAL_DAYS - 1) days from
// trial_started. Duplicated here to avoid pulling the Stripe-heavy billing
// handlers module into mutation-side bundles.
export const TRIAL_DAYS = 14;

// Canonical asset URLs. Templates default to these, so we only pass overrides
// when we genuinely need to. The /download/mac page handles OS detection itself,
// so the same download URL works for Mac and Windows visitors.
export const EMAIL_ASSETS = {
  downloadUrl: "https://getstage.co/download/mac",
  openAppUrl: "https://getstage.co/open",
  windowsWaitlistUrl: "https://forms.gle/7X47mM7NmzgoMjeV8",
} as const;

// Flow A: 1 & 1b from signup; 2-5 from trial_started (Stripe checkout with card).
// Flow B: all from payment_confirmed.
export const FLOW_STEPS: Record<EmailEventType, EmailStep[]> = {
  signed_up: [
    {
      flow: "trial",
      template: "welcome",
      delayMs: 2 * MIN, // let the DataFast visitor id attach first
      subject: "Welcome to Stage - download your app",
    },
    {
      flow: "trial",
      template: "download_reminder",
      delayMs: 24 * DAY,
      subject: "You haven't downloaded Stage yet",
    },
  ],
  trial_started: [
    {
      flow: "trial",
      template: "first_project",
      delayMs: 1 * DAY,
      subject: "Create your first project in 5 minutes",
    },
    {
      flow: "trial",
      template: "workflow_deep_dive",
      delayMs: 3 * DAY,
      subject: "The AI workflow that replaces 4 tools",
    },
    {
      flow: "trial",
      template: "client_portal",
      delayMs: 5 * DAY,
      subject: "Your clients don't need another Notion link",
    },
    {
      flow: "trial",
      template: "trial_ending",
      delayMs: (TRIAL_DAYS - 1) * DAY,
      subject: "Your trial ends tomorrow - here's what happens next",
    },
  ],
  payment_confirmed: [
    { flow: "retention", template: "welcome_pro", delayMs: 0, subject: "You're on the team" },
    {
      flow: "retention",
      template: "power_user_tips",
      delayMs: 3 * DAY,
      subject: "3 things most designers miss in Stage",
    },
    {
      flow: "retention",
      template: "daily_workflow",
      delayMs: 7 * DAY,
      subject: "How designers are using Stage daily",
    },
    {
      flow: "retention",
      template: "feedback",
      delayMs: 14 * DAY,
      subject: "Quick question",
    },
  ],
  // app_downloaded owns no drip steps — its effect is to cancel the pending 1b
  // reminder (handled in recordEmailEvent).
  app_downloaded: [],
};

// template → subject, derived from FLOW_STEPS so there's one source of truth.
export const SUBJECTS: Record<StageEmailTemplate, string> = Object.fromEntries(
  Object.values(FLOW_STEPS)
    .flat()
    .map((step) => [step.template, step.subject]),
) as Record<StageEmailTemplate, string>;
