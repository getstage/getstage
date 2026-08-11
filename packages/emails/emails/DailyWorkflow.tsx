import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { DISCORD_INVITE_URL } from "../components/links";

export interface DailyWorkflowProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  morningImageUrl?: string;
  afternoonImageUrl?: string;
  endOfDayImageUrl?: string;
  discordUrl?: string;
}

export const DailyWorkflow = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  morningImageUrl = "https://getstage.co/email/research-matrix.png",
  afternoonImageUrl = "https://getstage.co/email/vocal-shortcut.png",
  endOfDayImageUrl = "https://getstage.co/email/client-portal-mockup.png",
  discordUrl = DISCORD_INVITE_URL,
}: DailyWorkflowProps) => (
  <EmailLayout
    preview="How designers are using Stage daily."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>How designers are using Stage daily.</Text>
    <Text style={s.paragraph}>
      After a week on Stage, here's how designers are making it their daily
      driver:
    </Text>

    <Divider />

    <Text style={s.subheading}>Morning: new project lands</Text>
    <Text style={s.listItem}>
      Client sends a brief. Paste it into Stage. In 5 minutes you have
      competitor research, visual references, and a strategic direction -
      before you even open Figma.
    </Text>
    <Section style={s.sectionImageWrap}>
      <Img
        src={morningImageUrl}
        alt="Stage competitive analysis matrix"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>Afternoon: deep work</Text>
    <Text style={s.listItem}>
      You're designing in Figma. Hit Cmd + Shift + A, attach the window, and ask
      Stage for a quick critique - or talk it through with Cmd + Shift + V. No
      context switching.
    </Text>
    <Section style={s.sectionImageWrap}>
      <Img
        src={afternoonImageUrl}
        alt="Stage shortcut overlay on macOS"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>End of day: client update</Text>
    <Text style={s.listItem}>
      Share progress through your portal. Your client sees the work, leaves
      revisions in one place. No email threads, no Notion links, no "which
      version is latest?"
    </Text>
    <Section style={s.sectionImageWrap}>
      <Img
        src={endOfDayImageUrl}
        alt="Stage client portal - branded project board"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.paragraph}>
      One tool, the entire workflow. That's the idea.
    </Text>

    <CTAButton href={openAppUrl} label="Open Stage" iconUrl={stageIconUrl} />

    <Divider />

    <Text style={s.postscript}>
      P.S. If you haven't already,{" "}
      <Link href={discordUrl} style={s.textLink}>
        join the Discord
      </Link>{" "}
      - that's where feature requests turn into shipped updates.
    </Text>
  </EmailLayout>
);

DailyWorkflow.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  morningImageUrl: "/static/research-matrix.png",
  afternoonImageUrl: "/static/vocal-shortcut.png",
  endOfDayImageUrl: "/static/client-portal-mockup.png",
} satisfies DailyWorkflowProps;

export default DailyWorkflow;
