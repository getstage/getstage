import { Img, Link, Section, Text } from "@react-email/components";
import * as React from "react";
import { CTAButton, Divider, EmailLayout } from "../components/EmailLayout";
import * as s from "../components/tokens";
import { SLACK_INVITE_URL } from "../components/links";

export interface WorkflowDeepDiveProps {
  firstName?: string;
  openAppUrl?: string;
  markUrl?: string;
  stageIconUrl?: string;
  slackUrl?: string;
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
  slackUrl = SLACK_INVITE_URL,
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
      title="Research"
      body="AI pulls competitors, market trends, and UX patterns."
      alt="Research"
    />
    <Step
      iconUrl={directionsIconUrl}
      title="Directions"
      body="Get mood boards and concept territories based on your research."
      alt="Directions"
    />
    <Step
      iconUrl={structureIconUrl}
      title="Structure"
      body="Generate sitemaps, flows, and wireframes."
      alt="Structure"
    />

    <Divider />

    <Text style={s.paragraph}>
      Every step feeds into the next. Your research informs your concepts. Your
      concepts shape your wireframes. Nothing gets lost.
    </Text>
    <Text style={s.paragraph}>
      And because you connect your own Claude or Codex, there are no usage
      limits from Stage. Use it as much as you want.
    </Text>

    <CTAButton href={openAppUrl} label="Try it on a real project" iconUrl={stageIconUrl} />

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
