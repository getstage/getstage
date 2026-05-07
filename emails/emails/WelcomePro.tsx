import { Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";

export interface WelcomeProProps {
  firstName?: string;
  portalSetupUrl?: string;
  slackUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  slackIconUrl?: string;
  portalImageUrl?: string;
  slackImageUrl?: string;
}

export const WelcomePro = ({
  firstName = "there",
  portalSetupUrl = "https://getstage.co/portal",
  slackUrl = "https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  slackIconUrl = "https://getstage.co/email/slack-glyph-white.png",
  portalImageUrl = "https://getstage.co/email/client-portal-mockup.png",
  slackImageUrl = "https://getstage.co/email/slack-workspace.png",
}: WelcomeProProps) => (
  <EmailLayout
    preview="You're on the team. Welcome to Stage Pro."
    markUrl={markUrl}
    signoffLine="Excited to hear your thoughts on Stage as you start using it!"
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>You're on the team.</Text>
    <Text style={s.paragraph}>
      Thanks for going Pro. You now have full access to Stage - no limits, no
      expiration.
    </Text>
    <Text style={s.paragraph}>Two things to set up now:</Text>

    <Text style={s.subheading}>1. Your client portal</Text>
    <Text style={s.listItem}>
      Add your brand, logo, and custom domain. Takes 2 minutes and your clients
      will notice the difference.
    </Text>
    <Section style={s.sectionImageWrap}>
      <Img
        src={portalImageUrl}
        alt="Stage client portal - branded project board"
        style={s.sectionImage}
      />
    </Section>
    <CTAButton
      href={portalSetupUrl}
      label="Set up my portal"
      iconUrl={stageIconUrl}
    />

    <Divider />

    <Text style={s.subheading}>2. Join the Stage Slack</Text>
    <Text style={s.listItem}>
      This is where you get priority support, share feedback, and connect with
      other designers using Stage. I'm in there daily.
    </Text>
    <Section style={s.sectionImageWrap}>
      <Img
        src={slackImageUrl}
        alt="Stage Slack workspace"
        style={s.sectionImage}
      />
    </Section>
    <CTAButton
      href={slackUrl}
      label="Join the Slack channel"
      iconUrl={slackIconUrl}
    />

    <Divider />
  </EmailLayout>
);

WelcomePro.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  slackIconUrl: "/static/slack-glyph-white.svg",
  portalImageUrl: "/static/client-portal-mockup.png",
  slackImageUrl: "/static/slack-workspace.png",
} satisfies WelcomeProProps;

export default WelcomePro;
