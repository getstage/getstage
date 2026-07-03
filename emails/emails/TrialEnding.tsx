import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { SLACK_INVITE_URL } from "../components/links";

export interface TrialEndingProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  slackUrl?: string;
  workspaceImageUrl?: string;
}

export const TrialEnding = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  slackUrl = SLACK_INVITE_URL,
  workspaceImageUrl = "https://getstage.co/email/stage-workspace.png",
}: TrialEndingProps) => (
  <EmailLayout
    preview="Your trial ends tomorrow - here's what happens next."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>Your trial ends tomorrow.</Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={workspaceImageUrl}
        alt="Stage workspace dashboard"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.paragraph}>
      Quick heads up - your 14-day trial ends tomorrow. Your card on file will
      be charged automatically and your plan kicks in. No interruption, your
      projects stay exactly where they are.
    </Text>
    <Text style={s.paragraph}>
      If you want to cancel, you can do it in Settings before the trial ends.
      No questions asked.
    </Text>
    <Text style={s.paragraph}>
      But if Stage helped you move faster on even one project this week - the
      research, the AI workflows, the client portal - it's already paying for
      itself.
    </Text>

    <Divider />

    <Text style={s.subheading}>A few things you might not have tried yet:</Text>
    <Text style={s.listItem}>
      • Use the Mac shortcut to get instant AI feedback on whatever's on your
      screen
    </Text>
    <Text style={s.listItem}>
      • Generate multiple concept directions from a single brief
    </Text>
    <Text style={s.listItem}>
      • Use the portal to collect client revisions in one place
    </Text>

    <CTAButton href={openAppUrl} label="Open Stage" iconUrl={stageIconUrl} />

    <Text style={s.paragraph}>
      If you have any feedback or questions, just reply here. I read every one.
    </Text>

    <Divider />

    <Text style={s.postscript}>
      P.S. If you haven't already,{" "}
      <Link href={slackUrl} style={s.textLink}>
        join the Slack
      </Link>{" "}
      - that's where feature requests turn into shipped updates.
    </Text>
  </EmailLayout>
);

TrialEnding.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  workspaceImageUrl: "/static/stage-workspace.png",
} satisfies TrialEndingProps;

export default TrialEnding;
