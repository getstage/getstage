/**
 * Server-side render entry for Stage transactional emails.
 *
 * Single source of truth for the flow templates: the Convex send action imports
 * `renderStageEmail` and turns a template id + props into the HTML/plain-text
 * bodies handed to Resend. Keeping this here (next to the templates) means the
 * copy the design team edits in `email dev` is exactly what ships.
 */
import { pretty, render } from "@react-email/render";
import * as React from "react";

import { ClientPortal } from "./emails/ClientPortal";
import { DailyWorkflow } from "./emails/DailyWorkflow";
import { DownloadReminder } from "./emails/DownloadReminder";
import { Feedback } from "./emails/Feedback";
import { FirstProject } from "./emails/FirstProject";
import { PowerUserTips } from "./emails/PowerUserTips";
import { TrialEnding } from "./emails/TrialEnding";
import { WelcomeEmail } from "./emails/WelcomeEmail";
import { WelcomePro } from "./emails/WelcomePro";
import { WorkflowDeepDive } from "./emails/WorkflowDeepDive";
import { UnsubscribeUrlContext } from "./components/EmailLayout";

/** Stable identifiers used by the Convex flow scheduler. */
export type StageEmailTemplate =
  | "welcome"
  | "download_reminder"
  | "first_project"
  | "workflow_deep_dive"
  | "client_portal"
  | "trial_ending"
  | "welcome_pro"
  | "power_user_tips"
  | "daily_workflow"
  | "feedback";

/**
 * Every template accepts `firstName` plus optional URL overrides, all strings.
 * The scheduler only needs to pass `firstName` and (for the platform branch)
 * `downloadUrl` / `windowsWaitlistUrl`; the templates default the rest to the
 * production `getstage.co/email/...` asset URLs.
 */
export type StageEmailProps = Record<string, string | undefined>;

type EmailComponent = (props: StageEmailProps) => React.ReactElement;

const REGISTRY: Record<StageEmailTemplate, EmailComponent> = {
  welcome: WelcomeEmail as EmailComponent,
  download_reminder: DownloadReminder as EmailComponent,
  first_project: FirstProject as EmailComponent,
  workflow_deep_dive: WorkflowDeepDive as EmailComponent,
  client_portal: ClientPortal as EmailComponent,
  trial_ending: TrialEnding as EmailComponent,
  welcome_pro: WelcomePro as EmailComponent,
  power_user_tips: PowerUserTips as EmailComponent,
  daily_workflow: DailyWorkflow as EmailComponent,
  feedback: Feedback as EmailComponent,
};

export function isStageEmailTemplate(value: string): value is StageEmailTemplate {
  return Object.prototype.hasOwnProperty.call(REGISTRY, value);
}

export interface RenderedEmail {
  html: string;
  text: string;
}

/** Render a template to the HTML + plain-text bodies Resend needs. */
export async function renderStageEmail(
  template: StageEmailTemplate,
  props: StageEmailProps = {},
): Promise<RenderedEmail> {
  const Component = REGISTRY[template];
  if (!Component) {
    throw new Error(`Unknown Stage email template: ${template}`);
  }

  const element = React.createElement(Component, props);
  // Wrap so EmailLayout can read the per-recipient unsubscribe URL from context
  // without each template forwarding it explicitly.
  const withUnsubscribe = React.createElement(
    UnsubscribeUrlContext.Provider,
    { value: props.unsubscribeUrl },
    element,
  );
  const html = await pretty(await render(withUnsubscribe));
  const text = await render(withUnsubscribe, { plainText: true });

  return { html, text };
}
