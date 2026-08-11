import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { DISCORD_INVITE_URL } from "../components/links";

export interface WorkflowDeepDiveProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  discordUrl?: string;
  briefIconUrl?: string;
  researchIconUrl?: string;
  directionsIconUrl?: string;
  structureIconUrl?: string;
  workspaceImageUrl?: string;
}

interface StepProps {
  iconUrl: string;
  title: string;
  body: string;
  alt: string;
}

const Step = ({ iconUrl, title, body, alt }: StepProps) => (
  <Section style={s.stepRow}>
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{ borderCollapse: "separate" }}
    >
      <tbody>
        <tr>
          <td style={s.stepIconCell}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              style={{ borderCollapse: "separate" }}
            >
              <tbody>
                <tr>
                  <td style={s.stepIconChip}>
                    <Img src={iconUrl} width="20" height="20" alt={alt} style={s.stepIcon} />
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
          <td style={{ verticalAlign: "top" }}>
            <Text style={s.stepTitle}>{title}</Text>
            <Text style={s.stepBody}>{body}</Text>
          </td>
        </tr>
      </tbody>
    </table>
  </Section>
);

export const WorkflowDeepDive = ({
  firstName = "there",
  openAppUrl = "https://getstage.co/open",
  markUrl,
  stageIconUrl = "https://getstage.co/email/stage-mark-white.png",
  discordUrl = DISCORD_INVITE_URL,
  briefIconUrl = "https://getstage.co/email/icon-brief.png",
  researchIconUrl = "https://getstage.co/email/icon-research.png",
  directionsIconUrl = "https://getstage.co/email/icon-directions.png",
  structureIconUrl = "https://getstage.co/email/icon-structure.png",
  workspaceImageUrl = "https://getstage.co/email/stage-workspace.png",
}: WorkflowDeepDiveProps) => (
  <EmailLayout
    preview="The AI workflow that replaces 4 tools."
    markUrl={markUrl}
  >
    <Text style={s.greeting}>Hey {firstName},</Text>
    <Text style={s.lede}>The AI workflow that replaces 4 tools.</Text>
    <Text style={s.paragraph}>
      Most designers juggle Notion for briefs, Google for research, Pinterest
      for references, and Figma for wireframes. Four tabs, four tools, zero
      connection between them.
    </Text>

    <Section style={s.sectionImageWrap}>
      <Img
        src={workspaceImageUrl}
        alt="Stage workspace dashboard"
        style={s.sectionImage}
      />
    </Section>

    <Divider />

    <Text style={s.paragraph}>Stage replaces that with one workflow:</Text>

    <Step
      iconUrl={briefIconUrl}
      title="Brief"
      body="Paste or write your project brief."
      alt="Brief"
    />
    <Step
      iconUrl={researchIconUrl}
      title="Research & Strategy"
      body="AI pulls competitors, market trends, and UX patterns, then turns them into a strategy you can edit section by section."
      alt="Research"
    />
    <Step
      iconUrl={directionsIconUrl}
      title="Moodboard"
      body="Collect references from Refero, Figma, or your own uploads into named directions, then generate a style guide from the one you pick."
      alt="Moodboard"
    />
    <Step
      iconUrl={structureIconUrl}
      title="Flows & Wireframes"
      body="Generate user flows and the screens behind them, then wireframe those screens in Lo-Fi or Hi-Fi."
      alt="Flows and wireframes"
    />

    <Divider />

    <Text style={s.paragraph}>
      Every step feeds into the next. Your research informs your concepts. Your
      concepts shape your wireframes. Nothing gets lost.
    </Text>
    <Text style={s.paragraph}>
      And because Stage runs on your own Claude or Codex CLI, the heavy lifting
      happens on your provider subscription - Stage never resells you tokens.
    </Text>

    <CTAButton href={openAppUrl} label="Try it on a real project" iconUrl={stageIconUrl} />

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

WorkflowDeepDive.PreviewProps = {
  firstName: "Adrien",
  markUrl: "/static/stage-mark.svg",
  stageIconUrl: "/static/stage-mark-white.svg",
  briefIconUrl: "/static/icon-brief.png",
  researchIconUrl: "/static/icon-research.png",
  directionsIconUrl: "/static/icon-directions.png",
  structureIconUrl: "/static/icon-structure.png",
  workspaceImageUrl: "/static/stage-workspace.png",
} satisfies WorkflowDeepDiveProps;

export default WorkflowDeepDive;
