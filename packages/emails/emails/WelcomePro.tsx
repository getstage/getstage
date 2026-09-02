import { Img, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { DISCORD_INVITE_URL } from "../components/links";

export interface WelcomeProProps {
  firstName?: string;
  portalSetupUrl?: string;
  discordUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  discordIconUrl?: string;
  portalImageUrl?: string;
}

export const WelcomePro = ({
  firstName = "there",
  portalSetupUrl = "https://getstage.co/portal",
  discordUrl = DISCORD_INVITE_URL,
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  discordIconUrl = "https://getstage.co/email/discord-glyph-white.png",
  portalImageUrl = "https://getstage.co/email/client-portal-mockup.png",
}: WelcomeProProps) => (
  <EmailLayout
    preview="You're on the team. Welcome to Stage Pro."
    markUrl={markUrl}
    signoffLine="Excited to hear your thoughts on Stage as you start using it!"
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>You're on the team.</Text>
    <Text style={s.paragraph}>
      Thanks for going Pro. Every project type, the client portal, and your full
      monthly AI credit allowance are unlocked - and the trial clock is gone.
    </Text>
    <Text style={s.paragraph}>Two things to set up now:</Text>

    <Text style={s.subheading}>1. Your client portal</Text>
    <Text style={s.listItem}>
      Add your logo and brand colour, then share one link. Takes 2 minutes and
      your clients will notice the difference.
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

    <Text style={s.subheading}>2. Join the Stage Discord</Text>
    <Text style={s.listItem}>
      This is where you get priority support, share feedback, and connect with
      other designers using Stage. I'm in there daily.
    </Text>
    <CTAButton
      href={discordUrl}
      label="Join the Discord"
      iconUrl={discordIconUrl}
    />

    <Divider />
  </EmailLayout>
);

WelcomePro.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  discordIconUrl: "/static/discord-glyph-white.svg",
  portalImageUrl: "/static/client-portal-mockup.png",
} satisfies WelcomeProProps;

export default WelcomePro;
