import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { SLACK_INVITE_URL } from "../components/links";

export interface FirstProjectProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  slackUrl?: string;
  workspaceImageUrl?: string;
}

export const FirstProject = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  slackUrl = SLACK_INVITE_URL,
  workspaceImageUrl = "https://getstage.co/email/stage-workspace.png",
}: FirstProjectProps) => (
  <EmailLayout
    preview="Create your first project in 5 minutes."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>
      You're in - your 7-day trial is running. Let's make the most of it.
    </Text>
    <Text style={s.paragraph}>
      The fastest way to see what Stage can do: create your first project.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={workspaceImageUrl}
        alt="Stage workspace dashboard"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>Here's how (5 minutes):</Text>
    <Text style={s.listItem}>1. Open Stage and hit "New Project"</Text>
    <Text style={s.listItem}>
      2. Paste a brief or describe what you're working on
    </Text>
    <Text style={s.listItem}>
      3. Let the AI pull together research, references, and a starting direction
    </Text>

    <Text style={s.paragraph}>
      That's it. Stage takes your brief and gives you a head start - competitor
      research, visual references, and structure - so you're not starting from
      a blank canvas.
    </Text>

    <CTAButton href={openAppUrl} label="Open Stage" iconUrl={stageIconUrl} />

    <Text style={s.paragraph}>
      If you get stuck, just reply to this email. I read every one.
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

FirstProject.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  workspaceImageUrl: "/static/stage-workspace.png",
} satisfies FirstProjectProps;

export default FirstProject;
