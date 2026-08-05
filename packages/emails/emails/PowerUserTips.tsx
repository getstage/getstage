import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { DISCORD_INVITE_URL } from "../components/links";

export interface PowerUserTipsProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  discordUrl?: string;
  shortcutImageUrl?: string;
  iterateImageUrl?: string;
  critiqueImageUrl?: string;
}

export const PowerUserTips = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  discordUrl = DISCORD_INVITE_URL,
  shortcutImageUrl = "https://getstage.co/email/vocal-shortcut.png",
  iterateImageUrl = "https://getstage.co/email/regenerate-iterate.png",
  critiqueImageUrl = "https://getstage.co/email/ai-critique.png",
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

    <Text style={s.subheading}>1. Two Mac shortcuts</Text>
    <Text style={s.listItem}>
      Cmd + Shift + A opens Stage chat over whatever you're working in - Figma,
      a browser, anything. Cmd + Shift + V starts a voice note, so you can
      brief Stage out loud instead of typing.
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
        alt="Stage regenerate and iterate"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.subheading}>3. AI critique before client review</Text>
    <Text style={s.listItem}>
      Before you share work with a client, let Stage critique it first. Pin the
      project with @project, attach the window you're designing in, and Stage
      catches spacing issues, hierarchy problems, and inconsistencies you might
      miss after staring at a design for hours.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={critiqueImageUrl}
        alt="Stage AI critique on a Figma layout"
        style={s.sectionImage}
      />
    </Section>

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

PowerUserTips.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  shortcutImageUrl: "/static/vocal-shortcut.png",
  iterateImageUrl: "/static/regenerate-iterate.png",
  critiqueImageUrl: "/static/ai-critique.png",
} satisfies PowerUserTipsProps;

export default PowerUserTips;
