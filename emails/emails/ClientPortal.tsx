import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";

export interface ClientPortalProps {
  firstName?: string;
  portalSetupUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  portalImageUrl?: string;
  slackUrl?: string;
}

export const ClientPortal = ({
  firstName = "there",
  portalSetupUrl = "https://getstage.co/portal",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  portalImageUrl = "https://getstage.co/email/client-portal-mockup.png",
  slackUrl = "https://join.slack.com/t/stage-cnk9712/shared_invite/zt-3xaeofd5f-JuFnTgjh64n1Vqqbhg~DIQ",
}: ClientPortalProps) => (
  <EmailLayout
    preview="Your clients don't need another Notion link."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>Your clients don't need another Notion link.</Text>
    <Text style={s.paragraph}>
      Every freelancer knows the pain - sharing work through Notion links,
      Google Drive folders, or long email threads. Your clients lose track, you
      lose control.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={portalImageUrl}
        alt="Stage client portal - branded project board"
        style={s.sectionImage}
      />
    </Section>

    <Text style={s.paragraph}>
      Stage has a built-in client portal. One link, branded with your logo,
      colors, and custom domain. Share it with your team or your clients - they
      see project progress, deliverables, and can leave revisions directly.
    </Text>

    <Divider />

    <Text style={s.subheading}>What makes it different:</Text>
    <Text style={s.listItem}>
      • Your brand, your logo, your domain - not a generic tool link
    </Text>
    <Text style={s.listItem}>
      • Clients leave revisions right inside the portal
    </Text>
    <Text style={s.listItem}>
      • You see every revision live, no back-and-forth emails
    </Text>
    <Text style={s.listItem}>
      • Share with your team and clients from one place
    </Text>

    <Text style={s.paragraph}>
      No more screenshots in Slack. No more "check the Google Drive folder."
      One link, everything in sync.
    </Text>

    <CTAButton href={portalSetupUrl} label="Set up your client portal" iconUrl={stageIconUrl} />

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

ClientPortal.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  portalImageUrl: "/static/client-portal-mockup.png",
} satisfies ClientPortalProps;

export default ClientPortal;
