import { useEffect } from "react";
import { StageLandingMarkup } from "./StageLandingMarkup";
import { useStageLanding } from "./useStageLanding";
import { mcpServerUrl } from "@/lib/mcp";
import { mountMcpGuide } from "./mcp/mcp-connect.js";
import "./mcp/mcp-connect.css";
import "./mcp/mcp-motion.css";

const TITLE = "Stage | Think through your product before your AI builds it";
const DESCRIPTION =
  "Work through research, strategy, visual direction, flows and wireframes in Stage for Mac. Export a Markdown brief for Cursor, Claude Code or Codex.";

export function StageLandingPage() {
  useStageLanding({
    title: TITLE,
    description: DESCRIPTION,
    experience: true,
  });

  useEffect(() => mountMcpGuide(mcpServerUrl()), []);

  return <StageLandingMarkup />;
}
