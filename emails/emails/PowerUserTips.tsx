import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";

export interface PowerUserTipsProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  slackUrl?: string;
  shortcutImageUrl?: string;
  iterateImageUrl?: string;
  critiqueImageUrl?: string;
}

export const PowerUserTips = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  slackUrl = "https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ",
  shortcutImageUrl = "https://getstage.co/email/vocal-shortcut.png",
  iterateImageUrl = "https://getstage.co/email/ai-critique.png",
  critiqueImageUrl = "https://getstage.co/email/regenerate-iterate.png",
}: PowerUserTipsProps) => (
  <EmailLayout
    preview="3 things most designers miss in Stage."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>3 things most designers miss in Stage.</Text>
    <Text style={s.paragraph}>
      You've been on Stage for a few days now. Here are three features that
      most people don't find on their own:
    </Text>

    <Divider />

    <Text style={s.subheading}>1. Mac shortcut - your UX co-pilot</Text>
    <Text style={s.listItem}>
      Hit the shortcut from anywhere - Figma, a browser, whatever's on screen.
      Stage analyzes what you're looking at and gives you instant feedback.
      It's the fastest way to get a second opinion on any design.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={shortcutImageUrl}
        alt="Stage shortcut overlay on macOS"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>2. Regenerate and iterate</Text>
    <Text style={s.listItem}>
      Not happy with what Stage generated? Hit Regenerate. Or give it feedback
      and iterate - refine a strategy doc, rework a wireframe, adjust the
      direction. Stage gets sharper every round.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={iterateImageUrl}
        alt="Stage AI critique on a Figma layout"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>3. AI critique before client review</Text>
    <Text style={s.listItem}>
      Before you share work with a client, let Stage critique it first. It
      catches spacing issues, hierarchy problems, and inconsistencies you
      might miss after staring at a design for hours.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={critiqueImageUrl}
        alt="Stage regenerate and iterate"
        style={s.sectionImage}
      />
    </Section>

    <CTAButton href={openAppUrl} label="Open Stage" iconUrl={stageIconUrl} />

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

PowerUserTips.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  shortcutImageUrl: "/static/vocal-shortcut.png",
  iterateImageUrl: "/static/ai-critique.png",
  critiqueImageUrl: "/static/regenerate-iterate.png",
} satisfies PowerUserTipsProps;

export default PowerUserTips;
