import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";

export interface DownloadReminderProps {
  firstName?: string;
  downloadUrl?: string;
  windowsWaitlistUrl?: string;
  markUrl?: string;
  appleIconUrl?: string;
  heroUrl?: string;
}

export const DownloadReminder = ({
  firstName = "there",
  downloadUrl = "https://getstage.co/download/mac",
  windowsWaitlistUrl = "https://forms.gle/7X47mM7NmzgoMjeV8",
  markUrl,
  appleIconUrl = "https://getstage.co/email/apple-glyph-white.png",
  heroUrl = "https://getstage.co/email/stage-hero.png",
}: DownloadReminderProps) => (
  <EmailLayout
    preview="You haven't downloaded Stage yet - it takes 30 seconds."
    markUrl={markUrl}
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
    <Text style={s.lede}>You haven't downloaded Stage yet.</Text>
    <Text style={s.paragraph}>
      You signed up for Stage yesterday but haven't downloaded the app yet. No
      worries - it takes 30 seconds.
    </Text>

    <CTAButton
      href={downloadUrl}
      label="Download Stage for macOS"
      iconUrl={appleIconUrl}
    />

    <Text style={s.paragraph}>
      Once you open it, you'll set up your account and start your 14-day free
      trial. Everything runs locally on your Mac.
    </Text>

    <Divider />

    <Text style={s.secondary}>Not on Mac?</Text>
    <Text style={s.secondaryLinkRow}>
      <Link href={windowsWaitlistUrl} style={s.textLink}>
        Join the Windows waitlist →
      </Link>
    </Text>
  </EmailLayout>
);

DownloadReminder.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  appleIconUrl: "/static/apple-glyph-white.svg",
  heroUrl: "/static/stage-hero.png",
} satisfies DownloadReminderProps;

export default DownloadReminder;
