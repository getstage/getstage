import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { DISCORD_INVITE_URL } from "../components/links";

export interface FeedbackProps {
  firstName?: string;
  discordUrl?: string;
  avatarUrl?: string;
  workspaceImageUrl?: string;
}

export const Feedback = ({
  firstName = "there",
  discordUrl = DISCORD_INVITE_URL,
  avatarUrl = "https://getstage.co/email/adrien-avatar.png",
  workspaceImageUrl = "https://getstage.co/email/stage-workspace.png",
}: FeedbackProps) => (
  <EmailLayout
    preview="Quick question - how's Stage going?"
    headerNode={
      <Img
        src={avatarUrl}
        width="56"
        height="56"
        alt="Adrien"
        style={s.avatar}
      />
    }
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>Quick question.</Text>
    <Text style={s.paragraph}>
      You've been on Stage for two weeks now. I'd love to hear how it's going.
    </Text>
    <Text style={s.paragraph}>
      One quick question - what's the one thing you wish Stage did better?
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={workspaceImageUrl}
        alt="Stage workspace dashboard"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.paragraph}>
      Just reply to this email. I read every response personally and it
      directly shapes what we build next.
    </Text>
    <Text style={s.paragraph}>
      Thanks for being an early user. It means a lot.
    </Text>

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

Feedback.PreviewProps = {
  firstName: "Adrien",
  avatarUrl: "/static/adrien-avatar.png",
  workspaceImageUrl: "/static/stage-workspace.png",
} satisfies FeedbackProps;

export default Feedback;
