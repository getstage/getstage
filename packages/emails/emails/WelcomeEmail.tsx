import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";

export interface WelcomeEmailProps {
  firstName?: string;
  downloadUrl?: string;
  windowsWaitlistUrl?: string;
  markUrl?: string;
  heroUrl?: string;
  appleIconUrl?: string;
}

export const WelcomeEmail = ({
  firstName = "there",
  downloadUrl = "https://getstage.co/download/mac",
  windowsWaitlistUrl = "https://forms.gle/7X47mM7NmzgoMjeV8",
  markUrl,
  heroUrl = "https://getstage.co/email/stage-hero.png",
  appleIconUrl = "https://getstage.co/email/apple-glyph-white.png",
}: WelcomeEmailProps) => (
  <EmailLayout
    preview="Welcome to Stage - download the Mac app to start your trial."
    markUrl={markUrl}
    signoffLine="Talk soon,"
    hero={
      <Section style={s.heroSection}>
        <Img
          src={heroUrl}
          width="560"
          height="408"
          alt="Stage app on macOS - dashboard view"
          style={s.heroImg}
        />
      </Section>
    }
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>Welcome to Stage - you just made the right call.</Text>
    <Text style={s.paragraph}>
      Stage is a design workspace that takes you from brief to wireframes,
      powered by AI. Research, strategy, concepts, wireframes - all in one
      place, with your own Claude or Codex doing the heavy lifting.
    </Text>
    <Text style={s.paragraph}>Your next step: download Stage for Mac.</Text>

    <CTAButton
      href={downloadUrl}
      label="Download Stage for macOS"
      iconUrl={appleIconUrl}
    />

    <Text style={s.paragraph}>
      Once you open the app, you'll finish setting up your account and start
      your 14-day free trial. Your first project is 5 minutes away.
    </Text>

    <Divider />

    <Text style={s.secondary}>
      Quick heads up - Stage is a macOS app. If you're on Windows, no worries.
    </Text>
    <Text style={s.secondaryLinkRow}>
      <Link href={windowsWaitlistUrl} style={s.textLink}>
        Join the Windows waitlist →
      </Link>
    </Text>
  </EmailLayout>
);

WelcomeEmail.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  heroUrl: "/static/stage-hero.png",
  appleIconUrl: "/static/apple-glyph-white.svg",
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
