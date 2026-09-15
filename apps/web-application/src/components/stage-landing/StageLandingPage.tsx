import { StageLandingMarkup } from "./StageLandingMarkup";
import { useStageLanding } from "./useStageLanding";

const TITLE = "Stage | Think through your product before your AI builds it";
const DESCRIPTION =
  "Work through research, strategy, visual direction, flows and wireframes in Stage for Mac. Export a Markdown brief for Cursor, Claude Code or Codex.";

export function StageLandingPage() {
  useStageLanding({
    title: TITLE,
    description: DESCRIPTION,
    experience: true,
  });

  return <StageLandingMarkup />;
}
